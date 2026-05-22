import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { join } from 'node:path';
import * as tar from 'tar';
import {
  forgeBranchInfoUrl,
  forgeTarballUrl,
  UPSTREAM_REF,
} from '../../../shared/setup/pins.js';
import { setupStore } from '../../config/store.js';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';

const SHA_CACHE_MS = 24 * 60 * 60 * 1000;

interface BranchInfo {
  commit?: { sha?: string };
}

export async function resolveCommitSha(opts: {
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
}): Promise<string> {
  const cached = setupStore.get('upstreamSha');
  const fetchedAt = setupStore.get('upstreamShaFetchedAt') ?? 0;
  if (cached && Date.now() - fetchedAt < SHA_CACHE_MS) {
    opts.onLog({ stream: 'app', text: `using cached upstream SHA ${cached}`, ts: Date.now() });
    return cached;
  }
  const url = forgeBranchInfoUrl(UPSTREAM_REF);
  opts.onLog({ stream: 'app', text: `resolving upstream HEAD via ${url}`, ts: Date.now() });
  const res = await fetch(url, { signal: opts.signal, headers: { accept: 'application/vnd.github+json' } });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText} while resolving ${UPSTREAM_REF}`);
  }
  const body = (await res.json()) as BranchInfo;
  const sha = body.commit?.sha;
  if (!sha) throw new Error(`upstream ${UPSTREAM_REF} branch returned no commit.sha`);
  setupStore.set('upstreamSha', sha);
  setupStore.set('upstreamShaFetchedAt', Date.now());
  return sha;
}

export async function fetchForgeSource(opts: {
  paths: InstallPaths;
  sha: string;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
  onProgress?: (bytes: number, total: number | null) => void;
}): Promise<void> {
  if (existsSync(join(opts.paths.app, 'launch.py'))) {
    opts.onLog({ stream: 'app', text: `Forge already extracted at ${opts.paths.app}; skipping fetch`, ts: Date.now() });
    return;
  }
  await mkdir(opts.paths.app, { recursive: true });

  const url = forgeTarballUrl(opts.sha);
  opts.onLog({ stream: 'app', text: `GET ${url}`, ts: Date.now() });
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok || !res.body) {
    throw new Error(`tarball download failed: ${res.status} ${res.statusText}`);
  }
  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : null;
  let received = 0;
  let lastReport = 0;

  // Stage to a temp file first so a network error doesn't leave a half-extracted tree.
  const tmpPath = join(opts.paths.root, `.forge-source-${opts.sha}.tar.gz`);
  await pipeline(
    Readable.fromWeb(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = res.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            const now = Date.now();
            if (now - lastReport >= 250) {
              lastReport = now;
              opts.onProgress?.(received, total);
            }
            controller.enqueue(value);
          }
          opts.onProgress?.(received, total);
          controller.close();
        },
        cancel(reason) {
          opts.onLog({ stream: 'app', text: `tarball stream cancelled: ${String(reason)}`, ts: Date.now() });
        },
      }),
    ),
    createWriteStream(tmpPath),
  );

  opts.onLog({ stream: 'app', text: `extracting ${tmpPath} → ${opts.paths.app}`, ts: Date.now() });
  try {
    await pipeline(
      Readable.from(
        (async function* () {
          const { createReadStream } = await import('node:fs');
          yield* createReadStream(tmpPath);
        })(),
      ),
      createGunzip(),
      tar.x({ cwd: opts.paths.app, strip: 1 }),
    );
  } finally {
    await rm(tmpPath, { force: true }).catch(() => undefined);
  }

  if (!existsSync(join(opts.paths.app, 'launch.py'))) {
    throw new Error(`extraction completed but launch.py missing under ${opts.paths.app}`);
  }
}

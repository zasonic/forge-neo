import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';
import type { ModelOption } from '../../../shared/setup/steps.js';

const RETRY_BACKOFFS = [2_000, 5_000];

async function fileSize(path: string): Promise<number | null> {
  try {
    const s = await stat(path);
    return s.size;
  } catch {
    return null;
  }
}

async function downloadOne(opts: {
  url: string;
  destPath: string;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
  onProgress: (bytes: number, total: number | null) => void;
}): Promise<void> {
  const partPath = `${opts.destPath}.part`;
  await mkdir(dirname(opts.destPath), { recursive: true });

  // HEAD probe for size; skip if existing file already matches.
  const head = await fetch(opts.url, { method: 'HEAD', signal: opts.signal, redirect: 'follow' });
  const total = head.ok ? Number(head.headers.get('content-length') ?? '0') || null : null;
  const existing = await fileSize(opts.destPath);
  if (existing != null && total != null && existing === total) {
    opts.onLog({ stream: 'app', text: `already complete: ${opts.destPath} (${existing} bytes)`, ts: Date.now() });
    opts.onProgress(existing, total);
    return;
  }

  opts.onLog({ stream: 'app', text: `GET ${opts.url}`, ts: Date.now() });
  const res = await fetch(opts.url, { signal: opts.signal, redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status} ${res.statusText} ${opts.url}`);
  }

  let received = 0;
  let lastReport = 0;
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
              opts.onProgress(received, total);
            }
            controller.enqueue(value);
          }
          opts.onProgress(received, total);
          controller.close();
        },
      }),
    ),
    createWriteStream(partPath),
  );

  if (total != null) {
    const got = await fileSize(partPath);
    if (got != null && got !== total) {
      throw new Error(`download size mismatch: expected ${total}, got ${got} for ${opts.url}`);
    }
  }
  await rename(partPath, opts.destPath);
}

export async function downloadModels(opts: {
  paths: InstallPaths;
  options: ModelOption[];
  selectedIds: string[];
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
  onProgress?: (bytes: number, total: number | null) => void;
}): Promise<void> {
  const selected = opts.options.filter((o) => opts.selectedIds.includes(o.id));
  if (selected.length === 0) {
    opts.onLog({ stream: 'app', text: 'no starter models selected; skipping', ts: Date.now() });
    return;
  }
  let aggBytes = 0;
  let aggTotal = 0;
  for (const opt of selected) {
    for (const f of opt.files) {
      const destPath = join(opts.paths.app, f.destRelative);
      if (existsSync(destPath)) continue;
      let lastErr: Error | null = null;
      for (let attempt = 0; attempt <= RETRY_BACKOFFS.length; attempt += 1) {
        try {
          await downloadOne({
            url: f.url,
            destPath,
            onLog: opts.onLog,
            signal: opts.signal,
            onProgress: (b, t) => {
              const total = aggTotal + (t ?? 0);
              const value = aggBytes + b;
              opts.onProgress?.(value, total || null);
            },
          });
          const size = (await fileSize(destPath)) ?? 0;
          aggBytes += size;
          aggTotal += size;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          if (opts.signal.aborted) throw lastErr;
          const backoff = RETRY_BACKOFFS[attempt];
          if (backoff == null) break;
          opts.onLog({ stream: 'app', text: `download failed (${lastErr.message}); retrying in ${backoff}ms`, ts: Date.now() });
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      if (lastErr) throw lastErr;
    }
  }
}

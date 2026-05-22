import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export interface DownloadProgress {
  bytes: number;
  total: number | null;
  percent: number | null;
}

export interface DownloadOptions {
  signal?: AbortSignal;
  onProgress?: (p: DownloadProgress) => void;
  sha256?: string;
  retries?: number;
}

const DEFAULT_RETRIES = 4;

export async function downloadToFile(
  url: string,
  dest: string,
  options: DownloadOptions = {},
): Promise<{ bytes: number; sha256: string }> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (options.signal?.aborted) throw new Error('aborted');
    try {
      return await downloadOnce(url, dest, options);
    } catch (err) {
      lastError = err;
      if (options.signal?.aborted) throw err;
      const delayMs = 2_000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

async function downloadOnce(
  url: string,
  dest: string,
  options: DownloadOptions,
): Promise<{ bytes: number; sha256: string }> {
  await mkdir(dirname(dest), { recursive: true });
  const tmp = `${dest}.partial`;
  await rm(tmp, { force: true });

  const res = await fetch(url, { signal: options.signal });
  if (!res.ok || !res.body) {
    throw new Error(`download failed ${res.status} ${res.statusText}`);
  }
  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : null;

  const hash = createHash('sha256');
  let bytes = 0;
  const reader = Readable.fromWeb(res.body as never);

  reader.on('data', (chunk: Buffer) => {
    hash.update(chunk);
    bytes += chunk.length;
    options.onProgress?.({
      bytes,
      total,
      percent: total ? Math.round((bytes / total) * 100) : null,
    });
  });

  const out = createWriteStream(tmp);
  await pipeline(reader, out);

  const digest = hash.digest('hex');
  if (options.sha256 && digest.toLowerCase() !== options.sha256.toLowerCase()) {
    await rm(tmp, { force: true });
    throw new Error(`sha256 mismatch: expected ${options.sha256}, got ${digest}`);
  }

  await rename(tmp, dest);
  return { bytes, sha256: digest };
}

export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.text();
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

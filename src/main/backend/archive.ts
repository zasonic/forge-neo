import { createReadStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { x as extractTar } from 'tar';

export interface ExtractOptions {
  strip?: number;
  signal?: AbortSignal;
}

export async function extractTarGz(
  archive: string,
  dest: string,
  options: ExtractOptions = {},
): Promise<void> {
  await mkdir(dest, { recursive: true });
  await pipeline(
    createReadStream(archive),
    extractTar({ cwd: dest, strip: options.strip ?? 0 }),
    { signal: options.signal },
  );
}

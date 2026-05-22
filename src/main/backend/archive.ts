import { mkdir } from 'node:fs/promises';
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
  await extractTar({
    file: archive,
    cwd: dest,
    strip: options.strip ?? 0,
  });
}

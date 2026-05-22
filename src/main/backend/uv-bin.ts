import { existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import extractZip from 'extract-zip';
import { UV_DOWNLOAD_URL, UV_VERSION } from '../../shared/constants.js';
import { downloadToFile, fileExists } from './download.js';
import { spawnStream } from './spawn-stream.js';

interface ProgressReporter {
  (percent: number | null, message: string): void;
}

export async function ensureUv(
  uvBinPath: string,
  report: ProgressReporter,
  signal?: AbortSignal,
): Promise<void> {
  if (existsSync(uvBinPath)) {
    report(100, `uv already at ${uvBinPath}`);
    return;
  }

  const cacheDir = join(app.getPath('userData'), 'cache');
  await mkdir(cacheDir, { recursive: true });
  const archive = join(cacheDir, `uv-${UV_VERSION}-windows.zip`);

  if (!(await fileExists(archive))) {
    report(0, `downloading uv ${UV_VERSION}`);
    await downloadToFile(UV_DOWNLOAD_URL, archive, {
      signal,
      onProgress: (p) =>
        report(
          p.percent,
          `downloading uv ${UV_VERSION} (${formatMB(p.bytes)} / ${p.total ? formatMB(p.total) : '?'})`,
        ),
    });
  }

  report(null, 'extracting uv');
  const extractDir = join(cacheDir, `uv-${UV_VERSION}-windows`);
  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  await extractZip(archive, { dir: extractDir });

  // The astral-sh/uv Windows zip places uv.exe at the archive root.
  const sourceUv = join(extractDir, 'uv.exe');
  if (!existsSync(sourceUv)) {
    throw new Error(`uv.exe missing from extracted archive at ${sourceUv}`);
  }
  await mkdir(dirname(uvBinPath), { recursive: true });
  await rename(sourceUv, uvBinPath);
  report(100, `uv installed at ${uvBinPath}`);

  // sanity-check
  await spawnStream(uvBinPath, ['--version']);
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

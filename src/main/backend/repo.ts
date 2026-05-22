import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import { UPSTREAM_SHA, UPSTREAM_TARBALL_URL } from '../../shared/constants.js';
import { downloadToFile, fileExists } from './download.js';
import { extractTarGz } from './archive.js';

interface ProgressReporter {
  (percent: number | null, message: string): void;
}

export async function ensureRepo(
  appDir: string,
  report: ProgressReporter,
  signal?: AbortSignal,
): Promise<void> {
  if (existsSync(join(appDir, 'launch.py'))) return;

  const cacheDir = join(app.getPath('userData'), 'cache');
  await mkdir(cacheDir, { recursive: true });
  const archivePath = join(cacheDir, `forge-${UPSTREAM_SHA}.tar.gz`);

  if (!(await fileExists(archivePath))) {
    report(0, `downloading forge-classic@${UPSTREAM_SHA.slice(0, 7)}`);
    await downloadToFile(UPSTREAM_TARBALL_URL, archivePath, {
      signal,
      onProgress: (p) =>
        report(p.percent, `downloading source (${formatMB(p.bytes)} / ${p.total ? formatMB(p.total) : '?'})`),
    });
  }

  report(null, 'extracting source');
  // GitHub archive contains a top-level directory `sd-webui-forge-classic-<sha>/`.
  // Extract with strip:1 so its contents land directly in appDir.
  await mkdir(appDir, { recursive: true });
  await extractTarGz(archivePath, appDir, { strip: 1, signal });

  if (!existsSync(join(appDir, 'launch.py'))) {
    throw new Error('extracted archive does not contain launch.py at the expected path');
  }
}

export async function wipeRepo(appDir: string): Promise<void> {
  await rm(appDir, { recursive: true, force: true });
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import {
  PYTHON_ARCHIVE_NAME,
  PYTHON_DOWNLOAD_URL,
  PYTHON_MIRRORS,
  PYTHON_SHA256_URL,
  PYTHON_VERSION,
} from '../../shared/constants.js';
import { downloadToFile, fetchText, fileExists } from './download.js';
import { extractTarGz } from './archive.js';
import { spawnStream } from './spawn-stream.js';

interface ProgressReporter {
  (percent: number | null, message: string): void;
}

export interface PythonResolution {
  source: 'bundled' | 'byo';
  python: string;
}

function bundledPythonPath(runtimeDir: string): string {
  return join(runtimeDir, 'python', 'python.exe');
}

export async function ensurePython(
  runtimeDir: string,
  byoPython: string | null,
  report: ProgressReporter,
  signal?: AbortSignal,
): Promise<PythonResolution> {
  if (byoPython && existsSync(byoPython)) {
    await validatePython(byoPython);
    return { source: 'byo', python: byoPython };
  }

  const target = bundledPythonPath(runtimeDir);
  if (existsSync(target)) {
    return { source: 'bundled', python: target };
  }

  await mkdir(runtimeDir, { recursive: true });

  const cacheDir = join(app.getPath('userData'), 'cache');
  await mkdir(cacheDir, { recursive: true });
  const archivePath = join(cacheDir, PYTHON_ARCHIVE_NAME);

  let expectedSha: string | null = null;
  try {
    const shaBody = await fetchText(PYTHON_SHA256_URL, signal);
    expectedSha = shaBody.trim().split(/\s+/)[0] ?? null;
  } catch {
    expectedSha = null;
  }

  const urls = [PYTHON_DOWNLOAD_URL, ...PYTHON_MIRRORS];
  let lastError: unknown;
  for (const url of urls) {
    try {
      if (!(await fileExists(archivePath))) {
        report(0, `downloading Python ${PYTHON_VERSION}`);
        await downloadToFile(url, archivePath, {
          signal,
          sha256: expectedSha ?? undefined,
          onProgress: (p) =>
            report(p.percent, `downloading Python ${PYTHON_VERSION} (${formatMB(p.bytes)} / ${p.total ? formatMB(p.total) : '?'})`),
        });
      }
      report(null, 'extracting Python runtime');
      await extractTarGz(archivePath, runtimeDir, { strip: 0, signal });
      if (!existsSync(target)) {
        throw new Error(`expected ${target} after extract; archive layout unexpected`);
      }
      return { source: 'bundled', python: target };
    } catch (err) {
      lastError = err;
      await rm(archivePath, { force: true });
    }
  }
  throw lastError ?? new Error('python download failed');
}

export async function validatePython(python: string): Promise<string> {
  const res = await spawnStream(python, ['--version']);
  const ver = (res.stdout || res.stderr).trim();
  if (!/Python 3\.11\./.test(ver)) {
    throw new Error(`expected Python 3.11.x at ${python}; got "${ver}"`);
  }
  return ver;
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function resolvePythonPath(runtimeDir: string, byoPython: string | null): string {
  if (byoPython && existsSync(byoPython)) return byoPython;
  return bundledPythonPath(runtimeDir);
}


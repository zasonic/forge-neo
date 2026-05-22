import { statfs } from 'node:fs/promises';
import { spawnStream, SpawnStreamError } from './spawn-stream.js';
import { MIN_CUDA_DRIVER_VERSION, MIN_FREE_GB } from '../../shared/constants.js';

export interface PreflightResult {
  driver: { present: boolean; version: number | null; raw: string | null };
  disk: { freeBytes: number; freeGb: number };
  ok: boolean;
  problems: string[];
}

async function getNvidiaDriver(): Promise<{ version: number | null; raw: string | null }> {
  try {
    const res = await spawnStream('nvidia-smi', [
      '--query-gpu=driver_version',
      '--format=csv,noheader',
    ]);
    const raw = res.stdout.trim().split(/\r?\n/)[0] ?? '';
    const major = Number(raw.split('.')[0]);
    return { version: Number.isFinite(major) ? major : null, raw };
  } catch (err) {
    if (err instanceof SpawnStreamError || (err as { code?: string }).code === 'ENOENT') {
      return { version: null, raw: null };
    }
    throw err;
  }
}

export async function runPreflight(installRoot: string): Promise<PreflightResult> {
  const drv = await getNvidiaDriver();
  const fs = await statfs(installRoot).catch(async () => statfs(process.env.SystemDrive ?? 'C:\\'));
  const freeBytes = Number(fs.bsize) * Number(fs.bavail);
  const freeGb = freeBytes / 1024 ** 3;

  const problems: string[] = [];
  if (!drv.version) {
    problems.push('NVIDIA driver not detected (nvidia-smi not found).');
  } else if (drv.version < MIN_CUDA_DRIVER_VERSION) {
    problems.push(
      `NVIDIA driver ${drv.raw} is older than the required ${MIN_CUDA_DRIVER_VERSION} for CUDA 12.x.`,
    );
  }
  if (freeGb < MIN_FREE_GB) {
    problems.push(
      `Install drive has ${freeGb.toFixed(1)} GB free; need at least ${MIN_FREE_GB} GB.`,
    );
  }

  return {
    driver: { present: drv.version != null, version: drv.version, raw: drv.raw },
    disk: { freeBytes, freeGb },
    ok: problems.length === 0,
    problems,
  };
}

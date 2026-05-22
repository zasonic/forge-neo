import { execFile } from 'node:child_process';
import { statfs } from 'node:fs/promises';
import { promisify } from 'node:util';
import { totalmem } from 'node:os';
import { MIN_CUDA_DRIVER_VERSION, MIN_FREE_GB } from '../../shared/constants.js';
import { NETWORK_PROBE_TARGETS } from '../../shared/setup/pins.js';
import type { PreflightReport } from '../../shared/setup/steps.js';

const exec = promisify(execFile);

async function freeDiskGb(target: string): Promise<number | null> {
  try {
    const s = await statfs(target);
    return Number(((s.bavail * s.bsize) / 1024 ** 3).toFixed(1));
  } catch {
    return null;
  }
}

async function nvidiaDriver(): Promise<{ driverVersion: string | null; gpuName: string | null }> {
  // Prefer nvidia-smi when available — it's authoritative.
  try {
    const { stdout } = await exec(
      'nvidia-smi',
      ['--query-gpu=driver_version,name', '--format=csv,noheader'],
      { timeout: 5_000 },
    );
    const first = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (first) {
      const [driverVersion, ...nameParts] = first.split(',').map((s) => s.trim());
      return {
        driverVersion: driverVersion ?? null,
        gpuName: nameParts.join(', ') || null,
      };
    }
  } catch {
    // fall through
  }

  if (process.platform === 'win32') {
    try {
      const { stdout } = await exec(
        'wmic',
        ['path', 'win32_VideoController', 'get', 'DriverVersion,Name', '/format:csv'],
        { timeout: 5_000 },
      );
      const lines = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      // CSV header: Node,DriverVersion,Name
      for (const line of lines.slice(1)) {
        const parts = line.split(',');
        if (parts.length < 3) continue;
        const driverVersion = parts[1]?.trim() ?? '';
        const name = parts.slice(2).join(',').trim();
        if (/nvidia|geforce|rtx|gtx|quadro|tesla/i.test(name)) {
          return { driverVersion: driverVersion || null, gpuName: name || null };
        }
      }
    } catch {
      // fall through
    }
  }
  return { driverVersion: null, gpuName: null };
}

function majorDriverVersion(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d+)/);
  return m && m[1] ? Number(m[1]) : null;
}

async function probeUrl(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal, redirect: 'manual' });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function runPreflight(installRoot: string): Promise<PreflightReport> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8_000);
  try {
    const [free, gpu, github, hf, pytorch] = await Promise.all([
      freeDiskGb(installRoot),
      nvidiaDriver(),
      probeUrl(NETWORK_PROBE_TARGETS[0]!, ac.signal),
      probeUrl(NETWORK_PROBE_TARGETS[1]!, ac.signal),
      probeUrl(NETWORK_PROBE_TARGETS[2]!, ac.signal),
    ]);

    const totalRamGb = Number((totalmem() / 1024 ** 3).toFixed(1));
    const driverMajor = majorDriverVersion(gpu.driverVersion);
    const warnings: string[] = [];
    let ok = true;

    if (free != null && free < MIN_FREE_GB) {
      warnings.push(`Only ${free} GB free at ${installRoot}; recommended ${MIN_FREE_GB} GB.`);
    }
    if (!gpu.gpuName) {
      warnings.push('NVIDIA GPU not detected — install will fail at the torch step.');
      ok = false;
    }
    if (driverMajor != null && driverMajor < MIN_CUDA_DRIVER_VERSION) {
      warnings.push(
        `NVIDIA driver ${gpu.driverVersion} is older than ${MIN_CUDA_DRIVER_VERSION} required for CUDA 12.8.`,
      );
      ok = false;
    }
    if (!github || !hf || !pytorch) {
      warnings.push('Could not reach github.com / huggingface.co / download.pytorch.org.');
      ok = false;
    }

    return {
      freeDiskGb: free,
      minFreeDiskGb: MIN_FREE_GB,
      driverVersion: gpu.driverVersion,
      minDriverVersion: MIN_CUDA_DRIVER_VERSION,
      gpuName: gpu.gpuName,
      totalRamGb,
      network: { github, huggingface: hf, pytorch },
      ok,
      warnings,
    };
  } finally {
    clearTimeout(timer);
  }
}

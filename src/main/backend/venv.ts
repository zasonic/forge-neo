import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { spawnStream } from './spawn-stream.js';
import { resolveUvBinary } from './uv.js';
import { BASE_PIP_PINS, CLIP_ZIP_URL } from '../../shared/constants.js';

export interface VenvOptions {
  signal?: AbortSignal;
  onLine?: (line: string) => void;
}

export function venvPython(venvDir: string): string {
  return join(venvDir, 'Scripts', 'python.exe');
}

export async function createVenv(
  uvBinPath: string,
  python: string,
  venvDir: string,
  opts: VenvOptions = {},
): Promise<void> {
  if (existsSync(venvDir)) return;
  await mkdir(dirname(venvDir), { recursive: true });
  const uv = resolveUvBinary(uvBinPath);
  await spawnStream(uv, ['venv', venvDir, '--python', python], {
    signal: opts.signal,
    onStdout: opts.onLine,
    onStderr: opts.onLine,
  });
}

/**
 * Run a uv command scoped to the given venv via VIRTUAL_ENV. uv respects
 * that env var and resolves the interpreter without needing --python.
 */
export async function uvRun(
  uvBinPath: string,
  venvDir: string,
  args: readonly string[],
  opts: VenvOptions = {},
): Promise<void> {
  const uv = resolveUvBinary(uvBinPath);
  await spawnStream(uv, args, {
    signal: opts.signal,
    onStdout: opts.onLine,
    onStderr: opts.onLine,
    env: {
      ...process.env,
      VIRTUAL_ENV: venvDir,
    },
  });
}

export async function installBaseLayer(
  uvBinPath: string,
  venvDir: string,
  opts: VenvOptions = {},
): Promise<void> {
  await uvRun(uvBinPath, venvDir, ['pip', 'install', ...BASE_PIP_PINS], opts);
  await uvRun(
    uvBinPath,
    venvDir,
    ['pip', 'install', CLIP_ZIP_URL, '--no-build-isolation'],
    opts,
  );
}

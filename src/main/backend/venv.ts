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
  python: string,
  venvDir: string,
  opts: VenvOptions = {},
): Promise<void> {
  if (existsSync(venvDir)) return;
  await mkdir(dirname(venvDir), { recursive: true });
  const uv = resolveUvBinary();
  await spawnStream(uv, ['venv', venvDir, '--python', python], {
    signal: opts.signal,
    onStdout: opts.onLine,
    onStderr: opts.onLine,
  });
}

/**
 * Run a uv command (e.g. ['pip', 'install', 'wheel']) scoped to the given
 * venv via the VIRTUAL_ENV environment variable. uv respects that and
 * resolves the interpreter without needing an explicit --python flag.
 */
export async function uvRun(
  venvDir: string,
  args: readonly string[],
  opts: VenvOptions = {},
): Promise<void> {
  const uv = resolveUvBinary();
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
  venvDir: string,
  opts: VenvOptions = {},
): Promise<void> {
  await uvRun(venvDir, ['pip', 'install', ...BASE_PIP_PINS], opts);
  await uvRun(
    venvDir,
    ['pip', 'install', CLIP_ZIP_URL, '--no-build-isolation'],
    opts,
  );
}

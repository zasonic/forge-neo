import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolveBundledBinary } from '../../bundled.js';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';
import { runCommand } from '../runner.js';

export async function createVenv(opts: {
  paths: InstallPaths;
  interpreter: string;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
}): Promise<void> {
  if (existsSync(opts.paths.venvPython)) {
    opts.onLog({ stream: 'app', text: `venv already exists at ${opts.paths.venv}; skipping create`, ts: Date.now() });
    return;
  }
  await mkdir(opts.paths.app, { recursive: true });
  await runCommand({
    bin: resolveBundledBinary('uv.exe'),
    args: ['venv', '--python', opts.interpreter, opts.paths.venv],
    cwd: opts.paths.app,
    onLog: opts.onLog,
    signal: opts.signal,
  });
}

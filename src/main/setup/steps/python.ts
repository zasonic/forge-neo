import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { resolveBundledBinary } from '../../bundled.js';
import { PYTHON_VERSION } from '../../../shared/setup/pins.js';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';
import { runCommand } from '../runner.js';

const exec = promisify(execFile);

export function uvPythonInstallDir(paths: InstallPaths): string {
  return join(paths.runtime, 'pythons');
}

function uvEnv(paths: InstallPaths): NodeJS.ProcessEnv {
  return {
    ...process.env,
    UV_PYTHON_INSTALL_DIR: uvPythonInstallDir(paths),
  };
}

interface UvPythonEntry {
  version?: string;
  path?: string | null;
  key?: string;
}

export async function installPython(opts: {
  paths: InstallPaths;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
}): Promise<void> {
  await runCommand({
    bin: resolveBundledBinary('uv.exe'),
    args: ['python', 'install', PYTHON_VERSION],
    cwd: opts.paths.root,
    env: uvEnv(opts.paths),
    onLog: opts.onLog,
    signal: opts.signal,
  });
}

export async function discoverInterpreter(paths: InstallPaths): Promise<string> {
  const uvExe = resolveBundledBinary('uv.exe');
  const { stdout } = await exec(
    uvExe,
    ['python', 'list', '--only-installed', '--output-format', 'json'],
    { env: uvEnv(paths), timeout: 10_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const list = JSON.parse(stdout) as UvPythonEntry[];
  const installDir = uvPythonInstallDir(paths);
  const matches = list
    .filter((p) => p.version?.startsWith(`${PYTHON_VERSION}.`) && p.path?.startsWith(installDir))
    .sort((a, b) => (b.version ?? '').localeCompare(a.version ?? '', undefined, { numeric: true }));
  const chosen = matches[0]?.path;
  if (!chosen) {
    throw new Error(
      `No installed Python ${PYTHON_VERSION}.x found under ${installDir}; uv python install may have failed`,
    );
  }
  return chosen;
}

export async function pythonInstalledAlready(paths: InstallPaths): Promise<boolean> {
  try {
    await discoverInterpreter(paths);
    return true;
  } catch {
    return false;
  }
}

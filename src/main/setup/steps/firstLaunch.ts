import { spawn } from 'node:child_process';
import treeKill from 'tree-kill';
import { STDOUT_READY_PATTERN } from '../../../shared/constants.js';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';
import { envWithUvOnPath, watchStdoutFor } from '../runner.js';
import { settingsStore } from '../../config/store.js';

const DEFAULT_TIMEOUT_MS = 20 * 60_000;

/**
 * Run Forge once so it resolves its own requirements_versions.txt via the
 * vendored uv. Kill the child the moment it reaches the standard ready
 * pattern; we don't want to actually serve traffic from this invocation.
 */
export async function runFirstLaunch(opts: {
  paths: InstallPaths;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
}): Promise<void> {
  if (opts.signal.aborted) throw new Error('aborted before first-launch');

  const args = ['launch.py', '--cuda-malloc', '--skip-version-check', '--uv', '--exit'];
  // --exit isn't standard A1111 but Forge has historically accepted it
  // for boot-only resolution; we still belt+suspenders kill on the
  // ready pattern in case it's ignored.
  opts.onLog({ stream: 'app', text: `$ ${opts.paths.venvPython} ${args.join(' ')}`, ts: Date.now() });

  const env = envWithUvOnPath({ ...process.env, SD_WEBUI_RESTARTING: '1' });
  const child = spawn(opts.paths.venvPython, args, {
    cwd: opts.paths.app,
    env,
    windowsHide: true,
  });
  child.stdout?.setEncoding('utf-8');
  child.stderr?.setEncoding('utf-8');
  child.stdout?.on('data', (chunk: string) => opts.onLog({ stream: 'stdout', text: chunk, ts: Date.now() }));
  child.stderr?.on('data', (chunk: string) => opts.onLog({ stream: 'stderr', text: chunk, ts: Date.now() }));

  const timeoutMs = settingsStore.get('setupFirstLaunchTimeoutMs') ?? DEFAULT_TIMEOUT_MS;
  const ready = watchStdoutFor(child, STDOUT_READY_PATTERN);
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((res) => {
    child.once('exit', (code, signal) => res({ code, signal }));
  });

  const abortListener = (): void => {
    if (child.pid != null) treeKill(child.pid, 'SIGTERM');
  };
  opts.signal.addEventListener('abort', abortListener);

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timeoutHandle = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  try {
    const result = await Promise.race([ready.then(() => 'ready' as const), exited, timedOut]);
    if (result === 'timeout') {
      opts.onLog({ stream: 'app', text: `first-launch timed out after ${Math.round(timeoutMs / 1000)}s; killing`, ts: Date.now() });
      if (child.pid != null) treeKill(child.pid, 'SIGTERM');
      await exited;
      throw new Error(`first-launch did not finish within ${Math.round(timeoutMs / 1000)}s`);
    }
    if (result === 'ready') {
      opts.onLog({ stream: 'app', text: 'first-launch reached ready pattern; killing child', ts: Date.now() });
      if (child.pid != null) treeKill(child.pid, 'SIGTERM');
      await exited;
      return;
    }
    // child exited on its own (likely via --exit). Treat code 0 as success.
    if (result.code !== 0 && result.code != null) {
      throw new Error(`first-launch exited code=${result.code}`);
    }
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    opts.signal.removeEventListener('abort', abortListener);
  }
}

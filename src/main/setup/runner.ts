import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { dirname } from 'node:path';
import treeKill from 'tree-kill';
import { resolveBundledBinary } from '../bundled.js';
import type { LogLine } from '../../shared/ipc/contract.js';

const STDOUT_BUFFER_CAP = 64_000;

export class CommandError extends Error {
  constructor(
    public readonly bin: string,
    public readonly args: readonly string[],
    public readonly exitCode: number | null,
    public readonly signal: NodeJS.Signals | null,
    public readonly stderrTail: string,
  ) {
    const argsDisplay = args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
    super(`command failed (${exitCode ?? signal ?? 'unknown'}): ${bin} ${argsDisplay}\n${stderrTail}`);
    this.name = 'CommandError';
  }
}

export interface RunOpts {
  bin: string;
  args: readonly string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  onLog: (line: LogLine) => void;
  signal?: AbortSignal;
}

/**
 * Append the dirname of the vendored uv.exe to PATH so child processes
 * (notably Forge's `launch_utils.run_uv()` which calls `shutil.which`)
 * can locate it without needing the binary on the user's system PATH.
 */
export function envWithUvOnPath(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const uvDir = dirname(resolveBundledBinary('uv.exe'));
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const existing = base[pathKey] ?? base['PATH'] ?? '';
  const sep = process.platform === 'win32' ? ';' : ':';
  const merged = existing.split(sep).includes(uvDir) ? existing : `${uvDir}${sep}${existing}`;
  return { ...base, [pathKey]: merged };
}

export async function runCommand(opts: RunOpts): Promise<void> {
  const { bin, args, cwd, env, onLog, signal } = opts;
  if (signal?.aborted) throw new Error('aborted before spawn');

  onLog({ stream: 'app', text: `$ ${bin} ${args.join(' ')}`, ts: Date.now() });

  const spawnOpts: SpawnOptions = {
    cwd,
    env: env ?? process.env,
    windowsHide: true,
  };
  const child = spawn(bin, [...args], spawnOpts);
  child.stdout?.setEncoding('utf-8');
  child.stderr?.setEncoding('utf-8');

  let stderrTail = '';
  let stdoutBuf = '';
  let stderrBuf = '';

  const flushLines = (chunk: string, stream: 'stdout' | 'stderr', buf: string): string => {
    const combined = buf + chunk;
    const idx = combined.lastIndexOf('\n');
    if (idx === -1) return combined;
    const ready = combined.slice(0, idx);
    const remaining = combined.slice(idx + 1);
    for (const raw of ready.split(/\r?\n/)) {
      onLog({ stream, text: raw, ts: Date.now() });
    }
    return remaining;
  };

  child.stdout?.on('data', (chunk: string) => {
    stdoutBuf = flushLines(chunk, 'stdout', stdoutBuf);
  });
  child.stderr?.on('data', (chunk: string) => {
    stderrTail += chunk;
    if (stderrTail.length > STDOUT_BUFFER_CAP) stderrTail = stderrTail.slice(-STDOUT_BUFFER_CAP / 2);
    stderrBuf = flushLines(chunk, 'stderr', stderrBuf);
  });

  const abortListener = (): void => {
    if (child.pid != null) treeKill(child.pid, 'SIGTERM');
  };
  signal?.addEventListener('abort', abortListener);

  try {
    const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolve) => {
        child.once('exit', (code, sig) => resolve({ code, signal: sig }));
      },
    );
    // flush trailing partial lines
    if (stdoutBuf) onLog({ stream: 'stdout', text: stdoutBuf, ts: Date.now() });
    if (stderrBuf) onLog({ stream: 'stderr', text: stderrBuf, ts: Date.now() });

    if (exit.code !== 0) {
      throw new CommandError(bin, args, exit.code, exit.signal, stderrTail.trim().slice(-2000));
    }
  } finally {
    signal?.removeEventListener('abort', abortListener);
  }
}

/**
 * Watch a running child process's stdout for the first match of `pattern`.
 * Resolves once matched; the caller decides whether to kill the child.
 * The supervisor uses this for readiness; the wizard's first-launch step
 * uses it to kill the child after Forge logs "Running on local URL".
 */
export function watchStdoutFor(child: ChildProcess, pattern: RegExp): Promise<void> {
  return new Promise((resolve, reject) => {
    let buffered = '';
    let resolved = false;

    const onData = (chunk: string): void => {
      buffered += chunk;
      if (buffered.length > STDOUT_BUFFER_CAP) buffered = buffered.slice(-STDOUT_BUFFER_CAP / 2);
      if (pattern.test(buffered) && !resolved) {
        resolved = true;
        cleanup();
        resolve();
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new Error(`child exited before pattern matched (code=${code ?? 'null'} signal=${signal ?? 'null'})`));
    };
    const cleanup = (): void => {
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
    };

    child.stdout?.setEncoding('utf-8');
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
  });
}

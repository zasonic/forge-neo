import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import treeKill from 'tree-kill';

export interface SpawnStreamOptions extends SpawnOptions {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  /** AbortSignal to cancel the process. tree-killed on abort. */
  signal?: AbortSignal;
}

export interface SpawnStreamResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export class SpawnStreamError extends Error {
  constructor(
    message: string,
    public readonly code: number | null,
    public readonly stdout: string,
    public readonly stderr: string,
  ) {
    super(message);
    this.name = 'SpawnStreamError';
  }
}

function linewise(onLine: ((line: string) => void) | undefined): {
  push: (chunk: string) => void;
  flush: () => void;
} {
  let buf = '';
  return {
    push(chunk) {
      if (!onLine) return;
      buf += chunk;
      let i = buf.indexOf('\n');
      while (i !== -1) {
        onLine(buf.slice(0, i).replace(/\r$/, ''));
        buf = buf.slice(i + 1);
        i = buf.indexOf('\n');
      }
    },
    flush() {
      if (onLine && buf.length > 0) onLine(buf);
      buf = '';
    },
  };
}

export function spawnStream(
  command: string,
  args: readonly string[],
  options: SpawnStreamOptions = {},
): Promise<SpawnStreamResult> {
  const { onStdout, onStderr, signal, ...spawnOpts } = options;
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, { windowsHide: true, ...spawnOpts });
    } catch (err) {
      reject(err);
      return;
    }

    const outLines = linewise(onStdout);
    const errLines = linewise(onStderr);
    let stdout = '';
    let stderr = '';

    child.stdout?.setEncoding('utf-8');
    child.stderr?.setEncoding('utf-8');
    child.stdout?.on('data', (c: string) => {
      stdout += c;
      outLines.push(c);
    });
    child.stderr?.on('data', (c: string) => {
      stderr += c;
      errLines.push(c);
    });

    const abortHandler = (): void => {
      const pid = child.pid;
      if (pid != null) treeKill(pid, 'SIGKILL');
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', abortHandler);
      reject(err);
    });

    child.on('exit', (code, sig) => {
      outLines.flush();
      errLines.flush();
      signal?.removeEventListener('abort', abortHandler);
      if (signal?.aborted) {
        reject(new SpawnStreamError('aborted', code, stdout, stderr));
        return;
      }
      if (code === 0) {
        resolve({ code, signal: sig, stdout, stderr });
      } else {
        reject(new SpawnStreamError(
          `${command} exited with code ${code}`,
          code,
          stdout,
          stderr,
        ));
      }
    });
  });
}

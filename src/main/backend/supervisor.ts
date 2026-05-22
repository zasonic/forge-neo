import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import getPort from 'get-port';
import treeKill from 'tree-kill';
import {
  BACKEND_HOST,
  BACKEND_PORT_RANGE,
  READINESS_PROBE_PATH,
  STDOUT_READY_PATTERN,
  SUBPATH,
} from '../../shared/constants.js';
import type { BackendStatus, LogLine } from '../../shared/ipc/contract.js';
import type { InstallPaths } from '../../shared/paths.js';
import { envWithUvOnPath, watchStdoutFor } from '../setup/runner.js';

export interface SupervisorEvents {
  status: (status: BackendStatus) => void;
  log: (line: LogLine) => void;
}

export class Supervisor extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: BackendStatus = { kind: 'idle' };
  private stopping = false;

  constructor(private paths: InstallPaths) {
    super();
  }

  getStatus(): BackendStatus {
    return this.status;
  }

  private setStatus(s: BackendStatus): void {
    this.status = s;
    this.emit('status', s);
  }

  private log(stream: LogLine['stream'], text: string): void {
    this.emit('log', { stream, text, ts: Date.now() });
  }

  async start(): Promise<void> {
    if (this.child) return;

    if (!existsSync(this.paths.venvPython)) {
      this.log('app', `venv python not found at ${this.paths.venvPython}; run setup wizard first`);
      this.setStatus({ kind: 'crashed', code: null, signal: null });
      return;
    }
    if (!existsSync(this.paths.app)) {
      this.log('app', `app dir missing at ${this.paths.app}; run setup wizard first`);
      this.setStatus({ kind: 'crashed', code: null, signal: null });
      return;
    }

    const port = await getPort({
      port: Array.from(
        { length: BACKEND_PORT_RANGE[1] - BACKEND_PORT_RANGE[0] + 1 },
        (_, i) => BACKEND_PORT_RANGE[0] + i,
      ),
    });

    const args = [
      'launch.py',
      '--api',
      '--listen',
      '--port',
      String(port),
      '--subpath',
      SUBPATH,
      '--skip-version-check',
      '--cuda-malloc',
      '--uv',
    ];

    this.log('app', `spawning: ${this.paths.venvPython} ${args.join(' ')}`);
    this.setStatus({ kind: 'starting' });
    this.stopping = false;

    this.child = spawn(this.paths.venvPython, args, {
      cwd: this.paths.app,
      env: envWithUvOnPath({
        ...process.env,
        SD_WEBUI_RESTARTING: '1',
        TOKENIZERS_PARALLELISM: 'false',
      }),
      windowsHide: true,
    });

    const pid = this.child.pid ?? -1;
    this.setStatus({ kind: 'starting', pid });

    this.child.stderr?.setEncoding('utf-8');
    this.child.stdout?.on('data', (chunk: string) => this.log('stdout', chunk));
    this.child.stderr?.on('data', (chunk: string) => this.log('stderr', chunk));

    void watchStdoutFor(this.child, STDOUT_READY_PATTERN)
      .then(async () => {
        const baseUrl = `http://${BACKEND_HOST}:${port}`;
        const ok = await this.probeReady(baseUrl);
        if (ok && this.child) {
          this.setStatus({ kind: 'ready', pid, port, baseUrl });
        }
      })
      .catch(() => {
        // child exited before the readiness pattern fired; the exit
        // handler below records the crashed state.
      });

    this.child.on('exit', (code, signal) => {
      this.log('app', `backend exited code=${code} signal=${signal ?? 'null'}`);
      this.child = null;
      if (this.stopping) {
        this.setStatus({ kind: 'idle' });
      } else {
        this.setStatus({ kind: 'crashed', code, signal });
      }
    });
  }

  private async probeReady(baseUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}${READINESS_PROBE_PATH}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async stop(timeoutMs = 10_000): Promise<void> {
    if (!this.child) return;
    this.stopping = true;
    this.setStatus({ kind: 'stopping' });
    const pid = this.child.pid;
    if (pid == null) {
      this.child = null;
      this.setStatus({ kind: 'idle' });
      return;
    }

    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = (): void => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      this.child?.once('exit', done);
      treeKill(pid, 'SIGTERM');
      setTimeout(() => {
        if (!resolved) treeKill(pid, 'SIGKILL', done);
      }, timeoutMs);
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}

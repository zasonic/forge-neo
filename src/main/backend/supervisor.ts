import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import getPort from 'get-port';
import treeKill from 'tree-kill';
import {
  BACKEND_HOST,
  BACKEND_PORT_RANGE,
  READINESS_PROBE_PATH,
  STARTUP_TIMEOUT_MS,
} from '../../shared/constants.js';
import type { BackendStatus, LogLine } from '../../shared/ipc/contract.js';
import type { InstallPaths } from '../../shared/paths.js';

export interface SupervisorEvents {
  status: (status: BackendStatus) => void;
  log: (line: LogLine) => void;
}

export class Supervisor extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: BackendStatus = { kind: 'idle' };
  private stopping = false;
  private startupTimer: NodeJS.Timeout | null = null;
  private probeTimer: NodeJS.Timeout | null = null;

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
      '--port',
      String(port),
      '--skip-version-check',
      '--cuda-malloc',
    ];

    this.log('app', `spawning: ${this.paths.venvPython} ${args.join(' ')}`);
    this.setStatus({ kind: 'starting' });
    this.stopping = false;

    this.child = spawn(this.paths.venvPython, args, {
      cwd: this.paths.app,
      env: {
        ...process.env,
        SD_WEBUI_RESTARTING: '1',
        TOKENIZERS_PARALLELISM: 'false',
      },
      windowsHide: true,
    });

    const pid = this.child.pid ?? -1;
    this.setStatus({ kind: 'starting', pid });

    this.child.stdout?.setEncoding('utf-8');
    this.child.stderr?.setEncoding('utf-8');

    const baseUrl = `http://${BACKEND_HOST}:${port}`;

    this.startupTimer = setTimeout(() => {
      if (this.status.kind === 'starting') {
        this.log('app', `startup timed out after ${STARTUP_TIMEOUT_MS / 1000}s; killing backend`);
        void this.stop();
      }
    }, STARTUP_TIMEOUT_MS);

    this.probeTimer = setInterval(() => {
      if (this.status.kind !== 'starting') {
        this.clearProbeTimer();
        return;
      }
      void this.probeReady(baseUrl).then((ok) => {
        if (!ok) return;
        if (this.status.kind !== 'starting') return;
        this.clearProbeTimer();
        this.clearStartupTimer();
        this.setStatus({ kind: 'ready', pid, port, baseUrl });
      });
    }, 1000);

    this.child.stdout?.on('data', (chunk: string) => {
      this.log('stdout', chunk);
    });

    this.child.stderr?.on('data', (chunk: string) => {
      this.log('stderr', chunk);
    });

    this.child.on('exit', (code, signal) => {
      this.clearStartupTimer();
      this.clearProbeTimer();
      this.log('app', `backend exited code=${code} signal=${signal ?? 'null'}`);
      this.child = null;
      if (this.stopping) {
        this.setStatus({ kind: 'idle' });
      } else {
        this.setStatus({ kind: 'crashed', code, signal });
      }
    });
  }

  private clearStartupTimer(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
  }

  private clearProbeTimer(): void {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
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
    const child = this.child;
    if (!child) return;
    this.child = null;
    this.stopping = true;
    this.clearStartupTimer();
    this.clearProbeTimer();
    this.setStatus({ kind: 'stopping' });

    const pid = child.pid;
    if (pid == null) {
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
      child.once('exit', done);
      try {
        treeKill(pid, 'SIGTERM', (err) => {
          if (err) this.log('app', `treeKill SIGTERM error: ${err.message}`);
        });
      } catch (err) {
        this.log('app', `treeKill SIGTERM threw: ${err instanceof Error ? err.message : String(err)}`);
      }
      setTimeout(() => {
        if (resolved) return;
        try {
          treeKill(pid, 'SIGKILL', (err) => {
            if (err) this.log('app', `treeKill SIGKILL error: ${err.message}`);
            done();
          });
        } catch (err) {
          this.log('app', `treeKill SIGKILL threw: ${err instanceof Error ? err.message : String(err)}`);
          done();
        }
      }, timeoutMs);
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}

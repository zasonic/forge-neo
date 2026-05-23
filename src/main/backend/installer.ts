import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';
import {
  STEP_NAMES,
  TORCH_INSTALL_SPECS,
  UPSTREAM_SHA,
  type StepName,
} from '../../shared/constants.js';
import type { InstallerEvent, InstallerState } from '../../shared/ipc/contract.js';
import { settingsStore, setupStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';
import { runPreflight } from './preflight.js';
import { ensurePython, validatePython } from './python-runtime.js';
import { ensureUv } from './uv-bin.js';
import { createVenv, installBaseLayer, uvRun } from './venv.js';
import { ensureRepo } from './repo.js';
import { syncExtension } from './extension-sync.js';
import { runSmokeTest } from './smoke-test.js';
import type { Supervisor } from './supervisor.js';

interface StepContext {
  signal: AbortSignal;
  report: (percent: number | null, message: string) => void;
  log: (line: string) => void;
}

type StepFn = (ctx: StepContext) => Promise<void>;

export class Installer extends EventEmitter {
  private running = false;
  private abortController: AbortController | null = null;
  private currentStep: StepName | null = null;

  constructor(private supervisor: Supervisor) {
    super();
  }

  getState(): InstallerState {
    return {
      lastCompletedStep: setupStore.get('lastCompletedStep'),
      current: this.currentStep,
      running: this.running,
      installedAt: setupStore.get('installedAt'),
      upstreamSha: setupStore.get('upstreamSha'),
      completedTorchSpecs: setupStore.get('completedTorchSpecs'),
      byoPython: setupStore.get('byoPython'),
    };
  }

  setByoPython(path: string | null): void {
    setupStore.set('byoPython', path);
  }

  cancel(): void {
    this.abortController?.abort();
  }

  async reset(): Promise<void> {
    this.cancel();
    const root = settingsStore.get('installRoot');
    const paths = resolveInstallPaths(root);
    await rm(paths.app, { recursive: true, force: true });
    await rm(paths.runtime, { recursive: true, force: true });
    setupStore.set('lastCompletedStep', null);
    setupStore.set('installedAt', null);
    setupStore.set('completedTorchSpecs', []);
  }

  private emitEvent(e: InstallerEvent): void {
    this.emit('event', e);
  }

  async runFrom(start?: StepName): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const lastCompleted = setupStore.get('lastCompletedStep');
    const startIdx = start
      ? STEP_NAMES.indexOf(start)
      : lastCompleted
      ? STEP_NAMES.indexOf(lastCompleted) + 1
      : 0;

    try {
      for (let i = Math.max(0, startIdx); i < STEP_NAMES.length; i++) {
        const step = STEP_NAMES[i]!;
        if (signal.aborted) {
          this.emitEvent({ kind: 'cancelled' });
          return;
        }
        this.currentStep = step;
        this.emitEvent({ kind: 'step-start', step });
        const ctx: StepContext = {
          signal,
          report: (percent, message) =>
            this.emitEvent({ kind: 'progress', step, percent, message }),
          log: (line) => this.emitEvent({ kind: 'log', step, line }),
        };

        try {
          const fn = this.stepFns[step];
          if (fn) await fn(ctx);
          setupStore.set('lastCompletedStep', step);
          this.emitEvent({ kind: 'step-complete', step });
        } catch (err) {
          if (signal.aborted) {
            this.emitEvent({ kind: 'cancelled' });
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          this.emitEvent({ kind: 'step-failed', step, error: message });
          return;
        }
      }

      setupStore.set('installedAt', Date.now());
      this.emitEvent({ kind: 'done' });
    } finally {
      this.running = false;
      this.currentStep = null;
      this.abortController = null;
    }
  }

  private stepFns: Partial<Record<StepName, StepFn>> = {
    welcome: async () => {
      /* no-op; renderer captures install root */
    },

    preflight: async ({ report }) => {
      const root = settingsStore.get('installRoot');
      report(null, `checking ${root}`);
      const result = await runPreflight(root);
      if (!result.ok) {
        throw new Error(result.problems.join(' '));
      }
      report(100, `driver ${result.driver.raw ?? 'unknown'}, ${result.disk.freeGb.toFixed(1)} GB free`);
    },

    'python-runtime': async ({ signal, report }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      const byo = setupStore.get('byoPython');
      const res = await ensurePython(paths.runtime, byo, report, signal);
      const ver = await validatePython(res.python);
      report(100, `${ver} ready at ${res.python}`);
    },

    'uv-bin': async ({ signal, report }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      await ensureUv(paths.uvBin, report, signal);
    },

    venv: async ({ signal, report, log }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      const byo = setupStore.get('byoPython');
      const pyRes = await ensurePython(paths.runtime, byo, () => {}, signal);

      report(null, `creating venv at ${paths.venv}`);
      await createVenv(paths.uvBin, pyRes.python, paths.venv, { signal, onLine: log });

      report(null, 'installing wheel / setuptools / pip pins');
      await installBaseLayer(paths.uvBin, paths.venv, { signal, onLine: log });
      report(100, 'base layer installed');
    },

    repo: async ({ signal, report }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      await ensureRepo(paths.app, report, signal);
      report(100, 'source extracted');
    },

    torch: async ({ signal, report, log }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      const completed = new Set(setupStore.get('completedTorchSpecs'));
      const total = TORCH_INSTALL_SPECS.length;
      let done = 0;

      for (const spec of TORCH_INSTALL_SPECS) {
        done++;
        if (completed.has(spec.id)) {
          report(Math.round((done / total) * 100), `skipping ${spec.label} (cached)`);
          continue;
        }
        report(Math.round(((done - 1) / total) * 100), `installing ${spec.label}`);
        await uvRun(paths.uvBin, paths.venv, spec.args, { signal, onLine: log });
        completed.add(spec.id);
        setupStore.set('completedTorchSpecs', [...completed]);
      }
      report(100, 'torch stack installed');
    },

    extension: async ({ report }) => {
      const paths = resolveInstallPaths(settingsStore.get('installRoot'));
      report(null, 'copying forge-neo-api extension');
      await syncExtension(paths.extensions);
      report(100, 'extension synced');
    },

    'smoke-test': async ({ signal, report }) => {
      await runSmokeTest(this.supervisor, report, signal);
      setupStore.set('upstreamSha', UPSTREAM_SHA);
      report(100, 'smoke test passed');
    },

    model: async ({ report }) => {
      report(100, 'skipped (optional)');
    },

    done: async ({ report }) => {
      report(100, 'install complete');
    },
  };
}

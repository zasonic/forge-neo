import { EventEmitter } from 'node:events';
import type { LogLine } from '../../shared/ipc/contract.js';
import type { InstallPaths } from '../../shared/paths.js';
import {
  SETUP_STEPS,
  type ModelOption,
  type SetupOverallState,
  type SetupProgressEvent,
  type SetupStepId,
  type StepProgress,
  type StepReport,
  type StepStatus,
} from '../../shared/setup/steps.js';
import { setupStore } from '../config/store.js';
import { runPreflight } from './preflight.js';
import { loadModelOptions } from './manifests.js';
import {
  discoverInterpreter,
  installPython,
  pythonInstalledAlready,
} from './steps/python.js';
import { createVenv } from './steps/venv.js';
import { fetchForgeSource, resolveCommitSha } from './steps/source.js';
import {
  pipBitsandbytes,
  pipBootstrap,
  pipClip,
  pipDeepspeed,
  pipHfXet,
  pipNunchaku,
  pipSage,
  pipTorch,
  pipTriton,
} from './steps/pipInstall.js';
import { runFirstLaunch } from './steps/firstLaunch.js';
import { installExtension } from './steps/extension.js';
import { downloadModels } from './steps/modelDownload.js';

export interface OrchestratorEvents {
  progress: (event: SetupProgressEvent) => void;
  log: (line: LogLine) => void;
}

export class SetupOrchestrator extends EventEmitter {
  private overall: SetupOverallState = 'idle';
  private currentStep: SetupStepId | null = null;
  private statuses: Map<SetupStepId, StepStatus> = new Map();
  private messages: Map<SetupStepId, string> = new Map();
  private progresses: Map<SetupStepId, StepProgress> = new Map();
  private abortController: AbortController | null = null;
  private selectedModelIds: string[];
  private modelOptions: ModelOption[] | null = null;

  constructor(private getPaths: () => InstallPaths) {
    super();
    this.selectedModelIds = setupStore.get('selectedModelIds') ?? [];
    this.hydrateFromStore();
  }

  private hydrateFromStore(): void {
    const last = setupStore.get('lastCompletedStep');
    const installed = setupStore.get('installedAt');
    if (installed != null) {
      this.overall = 'done';
      for (const s of SETUP_STEPS) this.statuses.set(s.id, 'done');
      return;
    }
    if (!last) return;
    for (const s of SETUP_STEPS) {
      if (s.id === last) {
        this.statuses.set(s.id, 'done');
        break;
      }
      this.statuses.set(s.id, 'done');
    }
  }

  isInstalled(): boolean {
    return setupStore.get('installedAt') != null;
  }

  getModelOptions(): ModelOption[] {
    if (!this.modelOptions) this.modelOptions = loadModelOptions();
    return this.modelOptions;
  }

  setSelectedModels(ids: string[]): void {
    this.selectedModelIds = ids;
    setupStore.set('selectedModelIds', ids);
  }

  getProgress(): SetupProgressEvent {
    const steps: StepReport[] = SETUP_STEPS.map((s) => {
      const status = this.statuses.get(s.id) ?? 'pending';
      const report: StepReport = { id: s.id, status };
      const msg = this.messages.get(s.id);
      if (msg) report.message = msg;
      const p = this.progresses.get(s.id);
      if (p) report.progress = p;
      return report;
    });
    return { overall: this.overall, currentStep: this.currentStep, steps };
  }

  cancel(): void {
    if (!this.abortController) return;
    this.abortController.abort();
    this.overall = 'cancelled';
    this.emitProgress();
  }

  private emitProgress(): void {
    this.emit('progress', this.getProgress());
  }

  private setStepStatus(id: SetupStepId, status: StepStatus, message?: string): void {
    this.statuses.set(id, status);
    if (message != null) this.messages.set(id, message);
    this.emitProgress();
  }

  private setStepProgress(id: SetupStepId, progress: StepProgress | undefined): void {
    if (progress) this.progresses.set(id, progress);
    else this.progresses.delete(id);
    this.emitProgress();
  }

  private log = (line: LogLine): void => {
    this.emit('log', line);
  };

  async start(): Promise<void> {
    if (this.overall === 'running' || this.overall === 'preflight') return;
    if (this.isInstalled()) {
      this.overall = 'done';
      this.emitProgress();
      return;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const paths = this.getPaths();

    this.overall = 'running';
    this.emitProgress();

    try {
      const lastCompleted = setupStore.get('lastCompletedStep') as SetupStepId | null;
      const resumeFromIdx = lastCompleted
        ? SETUP_STEPS.findIndex((s) => s.id === lastCompleted) + 1
        : 0;

      for (let i = 0; i < SETUP_STEPS.length; i += 1) {
        if (signal.aborted) throw new Error('cancelled');
        const step = SETUP_STEPS[i]!;

        // preflight runs every time; persisted-skip applies to other steps only
        if (i < resumeFromIdx && step.id !== 'preflight') {
          this.setStepStatus(step.id, 'done', 'resumed from previous run');
          continue;
        }

        this.currentStep = step.id;
        this.setStepStatus(step.id, 'active');

        try {
          await this.runStep(step.id, paths, signal);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.setStepStatus(step.id, 'error', message);
          this.overall = 'failed';
          this.currentStep = null;
          this.emitProgress();
          return;
        }

        this.setStepStatus(step.id, 'done');
        this.setStepProgress(step.id, undefined);

        if (step.id !== 'preflight' && step.id !== 'finalize') {
          setupStore.set('lastCompletedStep', step.id);
        }
      }

      this.currentStep = null;
      this.overall = 'done';
      this.emitProgress();
    } finally {
      this.abortController = null;
    }
  }

  private async runStep(id: SetupStepId, paths: InstallPaths, signal: AbortSignal): Promise<void> {
    const onLog = this.log;
    const ctx = { paths, onLog, signal };

    switch (id) {
      case 'preflight': {
        const report = await runPreflight(paths.root);
        if (!report.ok) {
          throw new Error(report.warnings.join(' | '));
        }
        this.setStepStatus(id, 'active', report.warnings.join(' | ') || undefined);
        return;
      }
      case 'install-python': {
        if (await pythonInstalledAlready(paths)) {
          onLog({ stream: 'app', text: 'Python 3.11 already installed; skipping', ts: Date.now() });
          return;
        }
        await installPython(ctx);
        // sanity check
        await discoverInterpreter(paths);
        return;
      }
      case 'fetch-source': {
        const sha = await resolveCommitSha({ onLog, signal });
        await fetchForgeSource({
          ...ctx,
          sha,
          onProgress: (bytes, total) =>
            this.setStepProgress(id, { value: bytes, ...(total != null ? { total } : {}), unit: 'bytes' }),
        });
        return;
      }
      case 'create-venv': {
        const interpreter = await discoverInterpreter(paths);
        await createVenv({ ...ctx, interpreter });
        return;
      }
      case 'pip-bootstrap':       return pipBootstrap(ctx);
      case 'pip-clip':            return pipClip(ctx);
      case 'pip-torch':           return pipTorch(ctx);
      case 'pip-deepspeed':       return pipDeepspeed(ctx);
      case 'pip-bitsandbytes':    return pipBitsandbytes(ctx);
      case 'pip-nunchaku':        return pipNunchaku(ctx);
      case 'pip-triton':          return pipTriton(ctx);
      case 'pip-sage':            return pipSage(ctx);
      case 'first-launch':        return runFirstLaunch(ctx);
      case 'pip-hfxet':           return pipHfXet(ctx);
      case 'install-extension':   return installExtension({ paths, onLog });
      case 'download-models': {
        const options = this.getModelOptions();
        await downloadModels({
          ...ctx,
          options,
          selectedIds: this.selectedModelIds,
          onProgress: (bytes, total) =>
            this.setStepProgress(id, { value: bytes, ...(total != null ? { total } : {}), unit: 'bytes' }),
        });
        return;
      }
      case 'finalize': {
        setupStore.set('installedAt', Date.now());
        setupStore.set('lastCompletedStep', 'finalize');
        return;
      }
    }
  }
}

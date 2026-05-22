import { useState, type ReactElement } from 'react';
import { useAppStore } from '../../lib/store.js';
import { useSetupSync } from '../../hooks/useSetup.js';
import { StepList } from './StepList.js';
import { LogPane } from './LogPane.js';
import { PreflightCard } from './PreflightCard.js';
import { ModelPicker } from './ModelPicker.js';
import { InstallPathPicker } from './InstallPathPicker.js';

type WizardPhase = 'preflight' | 'models' | 'installing' | 'done' | 'failed' | 'cancelled';

export function SetupWizard(): ReactElement {
  useSetupSync();
  const progress = useAppStore((s) => s.setup);
  const [phase, setPhase] = useState<WizardPhase>('preflight');

  if (progress.overall === 'done' && phase !== 'done') {
    setPhase('done');
  } else if (progress.overall === 'failed' && phase !== 'failed') {
    setPhase('failed');
  } else if (progress.overall === 'cancelled' && phase !== 'cancelled') {
    setPhase('cancelled');
  }

  const totalSteps = progress.steps.length || 17;
  const doneSteps = progress.steps.filter((s) => s.status === 'done').length;
  const overallPct = (doneSteps / totalSteps) * 100;

  const startInstall = async (): Promise<void> => {
    setPhase('installing');
    await window.forge.setup.start();
  };

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Set up Forge Neo</h1>
            <p className="text-xs text-white/50">
              {phase === 'installing' || progress.overall === 'running' || progress.overall === 'preflight'
                ? `Installing — step ${Math.min(doneSteps + 1, totalSteps)} of ${totalSteps}`
                : phase === 'done'
                  ? 'Installation complete'
                  : phase === 'failed'
                    ? 'Installation failed'
                    : phase === 'cancelled'
                      ? 'Installation cancelled'
                      : 'First-time setup'}
            </p>
          </div>
          <div className="w-64 h-2 bg-bg-subtle rounded overflow-hidden">
            <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <aside className="w-80 shrink-0 border-r border-border overflow-y-auto p-3">
          <StepList progress={progress} />
        </aside>
        <main className="flex-1 min-w-0 p-6 overflow-y-auto">
          {phase === 'preflight' && (
            <PreflightCard onProceed={() => setPhase('models')} />
          )}
          {phase === 'models' && (
            <ModelPicker onConfirm={() => void startInstall()} />
          )}
          {phase === 'installing' && (
            <div className="h-full min-h-0 flex flex-col gap-3">
              <div className="text-sm text-white/70">
                Live install output. Each step's per-step progress shows in the left rail.
              </div>
              <div className="flex-1 min-h-0">
                <LogPane />
              </div>
            </div>
          )}
          {phase === 'failed' && <FailedPanel />}
          {phase === 'cancelled' && <CancelledPanel />}
          {phase === 'done' && <DonePanel />}
        </main>
      </div>

      <footer className="px-6 py-3 border-t border-border flex items-center gap-4">
        <InstallPathPicker disabled={phase === 'installing' || phase === 'done'} />
        <div className="ml-auto flex gap-2">
          {phase === 'installing' && (
            <button
              type="button"
              onClick={() => void window.forge.setup.cancel()}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
            >
              Cancel
            </button>
          )}
          {(phase === 'failed' || phase === 'cancelled') && (
            <button
              type="button"
              onClick={() => void startInstall()}
              className="px-3 py-1.5 rounded bg-accent text-accent-fg hover:opacity-90 text-sm"
            >
              Resume / Retry
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function FailedPanel(): ReactElement {
  return (
    <div className="space-y-3 max-w-xl">
      <h2 className="text-lg font-medium text-red-300">Installation failed</h2>
      <p className="text-sm text-white/70">
        One step errored. Inspect the log below for details, then click Resume / Retry to pick up from where it stopped.
      </p>
      <div className="h-64 min-h-0">
        <LogPane />
      </div>
    </div>
  );
}

function CancelledPanel(): ReactElement {
  return (
    <div className="space-y-3 max-w-xl">
      <h2 className="text-lg font-medium">Installation cancelled</h2>
      <p className="text-sm text-white/70">
        Setup was stopped. The partial state is preserved — click Resume / Retry to continue.
      </p>
    </div>
  );
}

function DonePanel(): ReactElement {
  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-medium text-emerald-300">Installation complete</h2>
      <p className="text-sm text-white/70">
        Forge Neo is ready. Click below to launch the main UI.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-3 py-2 rounded bg-accent text-accent-fg hover:opacity-90"
      >
        Open Forge Neo
      </button>
    </div>
  );
}

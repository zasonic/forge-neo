import type { ReactElement, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { STEP_NAMES, type StepName } from '@shared/constants.js';

interface StepDef {
  step: StepName;
  label: string;
  path: string;
}

const STEPS: StepDef[] = [
  { step: 'welcome', label: 'Welcome', path: '/setup/welcome' },
  { step: 'preflight', label: 'Preflight', path: '/setup/preflight' },
  { step: 'python-runtime', label: 'Python', path: '/setup/python' },
  { step: 'venv', label: 'Virtualenv', path: '/setup/venv' },
  { step: 'repo', label: 'Source', path: '/setup/repo' },
  { step: 'torch', label: 'Torch + GPU stack', path: '/setup/torch' },
  { step: 'extension', label: 'Extension', path: '/setup/extension' },
  { step: 'smoke-test', label: 'Smoke test', path: '/setup/smoke-test' },
  { step: 'done', label: 'Done', path: '/setup/done' },
];

function railClass(state: 'pending' | 'current' | 'complete'): string {
  if (state === 'complete') return 'bg-emerald-500/20 text-emerald-200';
  if (state === 'current') return 'bg-accent text-accent-fg';
  return 'bg-white/5 text-white/40';
}

export function SetupLayout({
  children,
  lastCompleted,
}: {
  children: ReactNode;
  lastCompleted: StepName | null;
}): ReactElement {
  const { pathname } = useLocation();
  const lastIdx = lastCompleted ? STEP_NAMES.indexOf(lastCompleted) : -1;

  return (
    <div className="h-full flex">
      <aside className="w-64 border-r border-border bg-bg-subtle p-4 space-y-1">
        <div className="px-2 pb-3">
          <div className="text-base font-semibold">First-run setup</div>
          <div className="text-xs text-white/40 mt-1">
            One-time install. Resumable if interrupted.
          </div>
        </div>
        {STEPS.map((s, i) => {
          const isCurrent = pathname.startsWith(s.path);
          const isComplete = STEP_NAMES.indexOf(s.step) <= lastIdx;
          const state: 'pending' | 'current' | 'complete' = isCurrent
            ? 'current'
            : isComplete
            ? 'complete'
            : 'pending';
          return (
            <NavLink
              key={s.step}
              to={s.path}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                isCurrent ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${railClass(state)}`}>
                {isComplete ? '✓' : i + 1}
              </span>
              {s.label}
            </NavLink>
          );
        })}
      </aside>
      <main className="flex-1 min-w-0 p-8 overflow-auto">{children}</main>
    </div>
  );
}

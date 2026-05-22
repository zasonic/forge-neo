import type { ReactElement } from 'react';
import type { SetupProgressEvent, StepStatus } from '@shared/ipc/contract.js';
import { SETUP_STEPS } from '@shared/setup/steps.js';

function badge(status: StepStatus): string {
  switch (status) {
    case 'pending':  return 'bg-white/10 text-white/50';
    case 'active':   return 'bg-amber-500/20 text-amber-200';
    case 'done':     return 'bg-emerald-500/20 text-emerald-200';
    case 'error':    return 'bg-red-500/20 text-red-200';
    case 'skipped':  return 'bg-white/5 text-white/30';
    default:         return 'bg-white/10 text-white/50';
  }
}

function glyph(status: StepStatus): string {
  switch (status) {
    case 'pending':  return '·';
    case 'active':   return '⟳';
    case 'done':     return '✓';
    case 'error':    return '✕';
    case 'skipped':  return '–';
    default:         return '·';
  }
}

export function StepList({ progress }: { progress: SetupProgressEvent }): ReactElement {
  const byId = new Map(progress.steps.map((s) => [s.id, s]));
  return (
    <ol className="space-y-1">
      {SETUP_STEPS.map((step) => {
        const report = byId.get(step.id);
        const status: StepStatus = report?.status ?? 'pending';
        const isCurrent = progress.currentStep === step.id;
        return (
          <li
            key={step.id}
            className={[
              'flex items-start gap-2 px-2 py-1.5 rounded text-sm',
              isCurrent ? 'bg-bg-panel' : '',
            ].join(' ')}
          >
            <span
              className={`inline-flex w-5 h-5 shrink-0 items-center justify-center rounded text-xs ${badge(status)}`}
            >
              {glyph(status)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate">{step.label}</div>
              {report?.message && (
                <div className="text-xs text-white/40 truncate">{report.message}</div>
              )}
              {report?.progress && (
                <ProgressBar value={report.progress.value} total={report.progress.total ?? null} unit={report.progress.unit ?? 'count'} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function ProgressBar({ value, total, unit }: { value: number; total: number | null; unit: 'bytes' | 'count' }): ReactElement {
  const pct = total && total > 0 ? Math.min(100, (value / total) * 100) : null;
  const fmt = unit === 'bytes' ? formatBytes : (n: number): string => String(n);
  return (
    <div className="mt-1 space-y-0.5">
      <div className="h-1 bg-bg-subtle rounded overflow-hidden">
        <div
          className="h-full bg-accent"
          style={pct != null ? { width: `${pct}%` } : { width: '100%', opacity: 0.4 }}
        />
      </div>
      <div className="text-[10px] text-white/40">
        {fmt(value)}{total != null ? ` / ${fmt(total)}` : ''}
      </div>
    </div>
  );
}

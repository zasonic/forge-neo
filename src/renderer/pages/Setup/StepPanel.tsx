import type { ReactElement } from 'react';
import type { StepStream } from '../../hooks/useInstaller.js';

export function StepPanel({
  stream,
  emptyMessage,
}: {
  stream: StepStream | undefined;
  emptyMessage: string;
}): ReactElement {
  if (!stream) {
    return <div className="text-sm text-white/50">{emptyMessage}</div>;
  }
  return (
    <div className="space-y-3">
      <div className="text-sm text-white/80">{stream.message || 'working…'}</div>
      <ProgressBar percent={stream.percent} />
      {stream.error && (
        <div className="text-sm rounded bg-red-500/10 border border-red-500/30 text-red-200 p-3">
          {stream.error}
        </div>
      )}
      {stream.lines.length > 0 && (
        <pre className="text-[11px] leading-snug max-h-72 overflow-auto bg-black/40 border border-border rounded p-3 whitespace-pre-wrap break-all">
          {stream.lines.join('\n')}
        </pre>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number | null }): ReactElement {
  if (percent == null) {
    return (
      <div className="h-2 rounded bg-white/10 overflow-hidden">
        <div className="h-full w-1/3 bg-accent/60 animate-pulse" />
      </div>
    );
  }
  return (
    <div className="h-2 rounded bg-white/10 overflow-hidden">
      <div
        className="h-full bg-accent transition-all"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

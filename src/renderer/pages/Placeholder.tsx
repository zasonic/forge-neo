import type { ReactElement } from 'react';

export function Placeholder({ title, milestone }: { title: string; milestone: string }): ReactElement {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-xl font-semibold">{title}</div>
        <div className="text-sm text-white/50 mt-2">Coming in {milestone}.</div>
      </div>
    </div>
  );
}

import type { ReactElement, ReactNode } from 'react';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-white/60 flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className="text-white/30">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

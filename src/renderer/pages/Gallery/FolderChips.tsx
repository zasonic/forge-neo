import { useMemo, type ReactElement } from 'react';
import type { OutputEntry } from '@shared/ipc/contract.js';

interface Props {
  entries: OutputEntry[];
  value: string | null;
  onChange: (value: string | null) => void;
}

function firstSegment(relPath: string): string {
  const norm = relPath.replace(/\\/g, '/');
  const i = norm.indexOf('/');
  return i >= 0 ? norm.slice(0, i) : '';
}

export function FolderChips({ entries, value, onChange }: Props): ReactElement {
  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const seg = firstSegment(e.relPath);
      if (seg) set.add(seg);
    }
    return Array.from(set).sort();
  }, [entries]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip active={value == null} onClick={() => onChange(null)}>
        All ({entries.length})
      </Chip>
      {folders.map((folder) => {
        const count = entries.reduce(
          (acc, e) => (firstSegment(e.relPath) === folder ? acc + 1 : acc),
          0,
        );
        return (
          <Chip
            key={folder}
            active={value === folder}
            onClick={() => onChange(folder)}
          >
            {folder} ({count})
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-xs border transition-colors',
        active
          ? 'bg-accent text-accent-fg border-accent'
          : 'bg-bg-panel border-border text-white/70 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

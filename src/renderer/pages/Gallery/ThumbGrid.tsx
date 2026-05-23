import { useEffect, useRef, useState, type ReactElement } from 'react';
import { basename } from '../../lib/pathlike.js';
import { fileUrl } from '../../lib/fileUrl.js';
import type { OutputEntry } from './index.js';

interface Props {
  entries: OutputEntry[];
  selected: OutputEntry | null;
  onSelect: (e: OutputEntry) => void;
}

export function ThumbGrid({ entries, selected, onSelect }: Props): ReactElement {
  if (entries.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 text-sm">
        No images yet. Run a generation to see results here.
      </div>
    );
  }
  return (
    <div className="p-3 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
      {entries.map((entry) => (
        <Thumb
          key={entry.path}
          entry={entry}
          isSelected={selected?.path === entry.path}
          onSelect={() => onSelect(entry)}
        />
      ))}
    </div>
  );
}

function Thumb({
  entry,
  isSelected,
  onSelect,
}: {
  entry: OutputEntry;
  isSelected: boolean;
  onSelect: () => void;
}): ReactElement {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <button
      ref={ref}
      onClick={onSelect}
      title={entry.path}
      className={[
        'block aspect-square overflow-hidden rounded border bg-bg-panel transition-colors',
        isSelected ? 'border-accent ring-2 ring-accent/40' : 'border-border hover:border-white/30',
      ].join(' ')}
    >
      {visible ? (
        <img
          src={fileUrl(entry.path)}
          alt={basename(entry.path)}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </button>
  );
}

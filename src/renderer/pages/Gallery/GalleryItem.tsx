import { memo, useState, type ReactElement } from 'react';
import type { OutputEntry } from '@shared/ipc/contract.js';
import { pathToForgeImg } from './pathToForgeImg.js';

interface Props {
  entry: OutputEntry;
  selected: boolean;
  onSelect: (entry: OutputEntry) => void;
}

function basename(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const i = norm.lastIndexOf('/');
  return i >= 0 ? norm.slice(i + 1) : norm;
}

function GalleryItemImpl({ entry, selected, onSelect }: Props): ReactElement {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      title={entry.relPath}
      className={[
        'group relative block aspect-square overflow-hidden rounded border bg-bg-panel',
        selected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border hover:border-white/30',
      ].join(' ')}
    >
      {broken ? (
        <div className="w-full h-full flex items-center justify-center text-xs text-white/40 px-2 text-center">
          missing
        </div>
      ) : (
        <img
          src={pathToForgeImg(entry.relPath)}
          alt={basename(entry.relPath)}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      )}
    </button>
  );
}

export const GalleryItem = memo(GalleryItemImpl);

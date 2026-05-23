import type { ReactElement } from 'react';
import type { OutputEntry } from '@shared/ipc/contract.js';
import { GalleryItem } from './GalleryItem.js';

interface Props {
  entries: OutputEntry[];
  selected: OutputEntry | null;
  onSelect: (entry: OutputEntry) => void;
}

export function GalleryGrid({ entries, selected, onSelect }: Props): ReactElement {
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-white/40">
        No images in this folder.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
        {entries.map((entry) => (
          <GalleryItem
            key={entry.path}
            entry={entry}
            selected={selected?.path === entry.path}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

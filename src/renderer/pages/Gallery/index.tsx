import { useMemo, useState, type ReactElement } from 'react';
import type { OutputEntry } from '@shared/ipc/contract.js';
import { EmptyState } from './EmptyState.js';
import { FolderChips } from './FolderChips.js';
import { GalleryGrid } from './GalleryGrid.js';
import { DetailPanel } from './DetailPanel.js';
import { useOutputs } from './useOutputs.js';

function firstSegment(relPath: string): string {
  const norm = relPath.replace(/\\/g, '/');
  const i = norm.indexOf('/');
  return i >= 0 ? norm.slice(0, i) : '';
}

export function GalleryPage(): ReactElement {
  const { status, refetch } = useOutputs();
  const [folder, setFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<OutputEntry | null>(null);

  const entries = useMemo(
    () => (status.kind === 'ready' ? status.entries : []),
    [status],
  );

  // If the active folder filter no longer matches any entry, treat as 'All'
  // for this render. We don't reset folder state because the user may want
  // it back when matching entries reappear.
  const effectiveFolder = useMemo(() => {
    if (folder == null) return null;
    return entries.some((e) => firstSegment(e.relPath) === folder)
      ? folder
      : null;
  }, [entries, folder]);

  // Drop the detail-panel selection if the underlying file disappeared.
  const effectiveSelected = useMemo(() => {
    if (!selected) return null;
    return entries.some((e) => e.path === selected.path) ? selected : null;
  }, [entries, selected]);

  const filtered = useMemo(() => {
    if (effectiveFolder == null) return entries;
    return entries.filter((e) => firstSegment(e.relPath) === effectiveFolder);
  }, [entries, effectiveFolder]);

  if (status.kind === 'loading') {
    return <EmptyState variant="loading" />;
  }
  if (status.kind === 'not-installed') {
    return <EmptyState variant="not-installed" />;
  }
  if (status.kind === 'error') {
    return (
      <EmptyState variant="error" message={status.message} onRetry={refetch} />
    );
  }
  if (entries.length === 0) {
    return <EmptyState variant="no-images" />;
  }

  return (
    <div className="h-full grid grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] min-h-0">
      <div className="flex flex-col min-h-0">
        <div className="p-3 border-b border-border flex items-center gap-3">
          <FolderChips
            entries={entries}
            value={effectiveFolder}
            onChange={setFolder}
          />
          <button
            type="button"
            onClick={refetch}
            className="ml-auto px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"
          >
            Refresh
          </button>
        </div>
        <GalleryGrid
          entries={filtered}
          selected={effectiveSelected}
          onSelect={setSelected}
        />
      </div>
      <DetailPanel entry={effectiveSelected} />
    </div>
  );
}

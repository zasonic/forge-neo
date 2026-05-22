import { useState, type ReactElement } from 'react';
import {
  useOptions,
  useSdModels,
  useSetCheckpoint,
} from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';

export function ModelsPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const models = useSdModels();
  const options = useOptions();
  const setCheckpoint = useSetCheckpoint();
  const [filter, setFilter] = useState('');

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to browse models.
      </div>
    );
  }

  const current = options.data?.sd_model_checkpoint ?? null;
  const list = (models.data ?? []).filter((m) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      m.model_name.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <header className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Models</h1>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="flex-1 max-w-xs px-3 py-1.5 rounded bg-bg-panel border border-border text-sm"
        />
        <button
          onClick={() => void models.refetch()}
          disabled={models.isFetching}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
        >
          {models.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {models.isLoading && (
        <div className="text-sm text-white/40">Loading checkpoints…</div>
      )}
      {models.isError && (
        <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          {models.error.message}
        </div>
      )}
      {setCheckpoint.isError && (
        <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          Switch failed: {setCheckpoint.error.message}
        </div>
      )}

      <ul className="flex-1 overflow-y-auto rounded border border-border divide-y divide-border bg-bg-panel/40">
        {list.map((m) => {
          const isCurrent = current === m.title;
          const isSwitching =
            setCheckpoint.isPending && setCheckpoint.variables === m.title;
          const shortHash =
            m.hash ?? (m.sha256 ? m.sha256.slice(0, 10) : null);
          return (
            <li
              key={m.title}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{m.model_name}</div>
                <div className="text-xs text-white/40 truncate font-mono">
                  {shortHash ?? '—'} · {m.filename ?? m.title}
                </div>
              </div>
              {isCurrent && (
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300">
                  Current
                </span>
              )}
              <button
                onClick={() => setCheckpoint.mutate(m.title)}
                disabled={isCurrent || setCheckpoint.isPending}
                className="px-3 py-1.5 rounded bg-accent text-accent-fg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSwitching ? 'Switching…' : 'Switch'}
              </button>
            </li>
          );
        })}
        {list.length === 0 && !models.isLoading && (
          <li className="px-4 py-6 text-center text-sm text-white/40">
            No checkpoints match.
          </li>
        )}
      </ul>
    </div>
  );
}

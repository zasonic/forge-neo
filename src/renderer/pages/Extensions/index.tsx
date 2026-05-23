import { useState, type ReactElement } from 'react';
import {
  useExtensions,
  useToggleExtension,
} from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';

export function ExtensionsPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const extensions = useExtensions();
  const toggle = useToggleExtension();
  const [filter, setFilter] = useState('');
  const [pendingRestart, setPendingRestart] = useState(false);

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to manage extensions.
      </div>
    );
  }

  const list = (extensions.data ?? []).filter((e) =>
    filter ? e.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const onToggle = async (name: string, enabled: boolean): Promise<void> => {
    await toggle.mutateAsync({ name, enabled });
    setPendingRestart(true);
  };

  const restart = async (): Promise<void> => {
    setPendingRestart(false);
    await window.forge.backend.restart();
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Extensions</h1>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="flex-1 max-w-xs px-3 py-1.5 rounded bg-bg-panel border border-border text-sm"
        />
        <button
          onClick={() => void extensions.refetch()}
          disabled={extensions.isFetching}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
        >
          {extensions.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {pendingRestart && (
        <div className="flex items-center gap-3 text-sm rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span className="text-amber-200">
            Backend restart required for extension changes to take effect.
          </span>
          <button
            onClick={() => void restart()}
            className="ml-auto px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-100"
          >
            Restart backend
          </button>
          <button
            onClick={() => setPendingRestart(false)}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Later
          </button>
        </div>
      )}

      {extensions.isLoading && (
        <div className="text-sm text-white/40">Loading extensions…</div>
      )}
      {extensions.isError && (
        <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          {extensions.error.message}
        </div>
      )}
      {toggle.isError && (
        <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          Toggle failed: {toggle.error.message}
        </div>
      )}

      <ul className="flex-1 overflow-y-auto rounded border border-border divide-y divide-border bg-bg-panel/40">
        {list.map((e) => {
          const isPending =
            toggle.isPending && toggle.variables?.name === e.name;
          return (
            <li
              key={e.name}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{e.name}</span>
                  {!e.enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60">
                      disabled
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/40 truncate font-mono">
                  {e.version ?? e.commit_hash?.slice(0, 10) ?? '—'}
                  {e.branch ? ` · ${e.branch}` : ''}
                </div>
                {e.remote && (
                  <div className="text-xs text-white/30 truncate">{e.remote}</div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={e.enabled}
                  disabled={isPending}
                  onChange={(ev) => void onToggle(e.name, ev.target.checked)}
                />
                <span className="text-xs text-white/60">
                  {isPending ? 'Saving…' : e.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </li>
          );
        })}
        {list.length === 0 && !extensions.isLoading && (
          <li className="px-4 py-6 text-center text-sm text-white/40">
            No extensions match.
          </li>
        )}
      </ul>

      <div className="text-xs text-white/40">
        Forge Neo does not install or update extensions from the API — manage
        the extensions folder manually on disk.
      </div>
    </div>
  );
}

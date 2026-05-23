import { useEffect, useState, type ReactElement } from 'react';
import type { SettingsShape } from '@shared/ipc/contract.js';
import {
  useRefreshCheckpoints,
  useRefreshEmbeddings,
  useRefreshLoras,
  useRefreshVae,
} from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';

export function AppSettings(): ReactElement {
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const status = useAppStore((s) => s.status);
  const refreshCkpts = useRefreshCheckpoints();
  const refreshVae = useRefreshVae();
  const refreshEmb = useRefreshEmbeddings();
  const refreshLoras = useRefreshLoras();

  useEffect(() => {
    void window.forge.settings.get().then((s) => {
      setSettings(s);
      setAuthUser(s.apiAuth?.user ?? '');
      setAuthPass(s.apiAuth?.pass ?? '');
    });
  }, []);

  if (!settings) {
    return <div className="p-6 text-sm text-white/40">Loading…</div>;
  }

  const patch = async (p: Partial<SettingsShape>): Promise<void> => {
    const next = await window.forge.settings.set(p);
    setSettings(next);
  };

  const pickRoot = async (): Promise<void> => {
    const chosen = await window.forge.dialog.openDirectory();
    if (!chosen) return;
    await patch({ installRoot: chosen });
  };

  const saveAuth = async (): Promise<void> => {
    const value =
      authUser.trim() || authPass.trim() ? { user: authUser, pass: authPass } : null;
    await patch({ apiAuth: value });
  };

  const backendReady = status.kind === 'ready';

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">
          Install
        </h2>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Install root</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={settings.installRoot}
              className="flex-1 px-3 py-2 rounded bg-bg-panel border border-border text-sm"
            />
            <button
              onClick={() => void pickRoot()}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
            >
              Browse…
            </button>
          </div>
          <div className="text-xs text-white/40">
            Restart the app for changes here to take effect.
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">
          Backend
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoStartBackend}
            onChange={(e) => void patch({ autoStartBackend: e.target.checked })}
          />
          Start backend automatically on launch
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.liveProgressEnabled}
            onChange={(e) => void patch({ liveProgressEnabled: e.target.checked })}
          />
          Enable live progress previews during generation
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.extensionEnabled}
            onChange={(e) => void patch({ extensionEnabled: e.target.checked })}
          />
          Install vendored <code>forge-neo-api</code> extension on next backend start
        </label>
        <div className="grid grid-cols-[1fr_max-content] gap-2 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-white/60">Port (blank for auto)</span>
            <input
              type="number"
              min={1024}
              max={65535}
              value={settings.port ?? ''}
              onChange={(e) =>
                void patch({
                  port: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="px-2 py-1.5 rounded bg-bg-panel border border-border"
            />
          </label>
          <button
            onClick={() => void window.forge.backend.restart()}
            disabled={!backendReady}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
          >
            Restart backend
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">
          API auth
        </h2>
        <p className="text-xs text-white/40">
          Used when Forge is started with{' '}
          <code>--api-auth user:pass</code> behind a reverse proxy.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="user"
            value={authUser}
            onChange={(e) => setAuthUser(e.target.value)}
            className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm"
          />
          <input
            type="password"
            placeholder="password"
            value={authPass}
            onChange={(e) => setAuthPass(e.target.value)}
            className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm"
          />
        </div>
        <button
          onClick={() => void saveAuth()}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Save credentials
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">
          Refresh
        </h2>
        <p className="text-xs text-white/40">
          Re-scan model and embedding folders after adding files outside the app.
        </p>
        <div className="flex flex-wrap gap-2">
          <RefreshButton
            label="Checkpoints"
            mutation={refreshCkpts}
            ready={backendReady}
          />
          <RefreshButton label="VAE" mutation={refreshVae} ready={backendReady} />
          <RefreshButton
            label="Embeddings"
            mutation={refreshEmb}
            ready={backendReady}
          />
          <RefreshButton
            label="LoRAs"
            mutation={refreshLoras}
            ready={backendReady}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-white/40">
          Updates
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoUpdate}
            onChange={(e) => void patch({ autoUpdate: e.target.checked })}
          />
          Check for app updates automatically{' '}
          <span className="text-xs text-white/40">(M6 — placeholder)</span>
        </label>
      </section>
    </div>
  );
}

interface MutationLike {
  mutate: () => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

function RefreshButton({
  label,
  mutation,
  ready,
}: {
  label: string;
  mutation: MutationLike;
  ready: boolean;
}): ReactElement {
  return (
    <button
      onClick={() => {
        mutation.reset();
        mutation.mutate();
      }}
      disabled={!ready || mutation.isPending}
      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
      title={mutation.isError ? mutation.error?.message : undefined}
    >
      {mutation.isPending
        ? `Refreshing ${label}…`
        : mutation.isError
          ? `${label} failed`
          : mutation.isSuccess
            ? `${label} ✓`
            : `Refresh ${label}`}
    </button>
  );
}

import { useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SettingsShape } from '@shared/ipc/contract.js';

export function InstallPathPicker({ disabled }: { disabled: boolean }): ReactElement {
  const settings = useQuery<SettingsShape>({
    queryKey: ['settings'],
    queryFn: () => window.forge.settings.get(),
    staleTime: 1_000,
  });
  const [busy, setBusy] = useState(false);

  const browse = async (): Promise<void> => {
    setBusy(true);
    try {
      const next = await window.forge.dialog.openDirectory(settings.data?.installRoot);
      if (next) {
        await window.forge.setup.setInstallRoot(next);
        await settings.refetch();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-white/60">
      <span>Install at</span>
      <code className="px-2 py-1 bg-bg-subtle border border-border rounded text-white/80 truncate max-w-xl">
        {settings.data?.installRoot ?? '…'}
      </code>
      <button
        type="button"
        onClick={() => void browse()}
        disabled={disabled || busy}
        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Choose…
      </button>
    </div>
  );
}

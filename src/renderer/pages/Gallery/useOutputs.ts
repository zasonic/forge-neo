import { useEffect, useState } from 'react';
import type { OutputEntry } from '@shared/ipc/contract.js';

export type OutputsStatus =
  | { kind: 'loading' }
  | { kind: 'not-installed' }
  | { kind: 'ready'; entries: OutputEntry[] }
  | { kind: 'error'; message: string };

const REFRESH_DEBOUNCE_MS = 200;

export function useOutputs(): {
  status: OutputsStatus;
  refetch: () => void;
} {
  const [status, setStatus] = useState<OutputsStatus>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;

    window.forge.installer
      .state()
      .then((installer) => {
        if (!alive) return;
        if (installer.installedAt == null) {
          setStatus({ kind: 'not-installed' });
          return;
        }
        window.forge.fs
          .scanOutputs()
          .then((entries) => {
            if (!alive) return;
            setStatus({ kind: 'ready', entries });
          })
          .catch((err: unknown) => {
            if (!alive) return;
            const message = err instanceof Error ? err.message : String(err);
            setStatus({ kind: 'error', message });
          });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: 'error', message });
      });

    return () => {
      alive = false;
    };
  }, [version]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;
    const bump = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), REFRESH_DEBOUNCE_MS);
    };
    window.forge.fs.watchOutputs().then((ok) => {
      if (ok) unsubscribe = window.forge.fs.onOutputsChanged(bump);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return { status, refetch: () => setVersion((v) => v + 1) };
}

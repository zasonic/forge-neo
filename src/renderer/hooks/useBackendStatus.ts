import { useEffect } from 'react';
import { useAppStore } from '../lib/store.js';

export function useBackendStatusSync(): void {
  const setStatus = useAppStore((s) => s.setStatus);
  useEffect(() => {
    void window.forge.backend.getStatus().then(setStatus);
    const off = window.forge.backend.onStatus(setStatus);
    return () => off();
  }, [setStatus]);
}

import { useEffect } from 'react';
import { useAppStore } from '../lib/store.js';

export function useSetupSync(): void {
  const setSetup = useAppStore((s) => s.setSetup);
  useEffect(() => {
    void window.forge.setup.getProgress().then(setSetup);
    const off = window.forge.setup.onProgress(setSetup);
    return () => off();
  }, [setSetup]);
}

import { create } from 'zustand';
import type { BackendStatus } from '@shared/ipc/contract.js';

interface AppState {
  status: BackendStatus;
  setStatus: (s: BackendStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: { kind: 'idle' },
  setStatus: (status) => set({ status }),
}));

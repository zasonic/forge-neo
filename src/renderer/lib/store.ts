import { create } from 'zustand';
import type { BackendStatus, SetupProgressEvent } from '@shared/ipc/contract.js';

const emptySetup: SetupProgressEvent = {
  overall: 'idle',
  currentStep: null,
  steps: [],
};

interface AppState {
  status: BackendStatus;
  setStatus: (s: BackendStatus) => void;
  setup: SetupProgressEvent;
  setSetup: (event: SetupProgressEvent) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: { kind: 'idle' },
  setStatus: (status) => set({ status }),
  setup: emptySetup,
  setSetup: (event) => set({ setup: event }),
}));

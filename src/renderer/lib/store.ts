import { create } from 'zustand';
import type { BackendStatus } from '@shared/ipc/contract.js';
import type { Txt2ImgPayload } from '@shared/api/schemas.js';

export type Txt2ImgParams = Partial<Txt2ImgPayload>;

export const txt2imgDefaults: Txt2ImgParams = {
  prompt: '',
  negative_prompt: '',
  steps: 20,
  cfg_scale: 7,
  width: 512,
  height: 512,
  seed: -1,
  batch_size: 1,
  n_iter: 1,
  enable_hr: false,
  hr_scale: 2,
  denoising_strength: 0.7,
  save_images: true,
};

interface AppState {
  status: BackendStatus;
  setStatus: (s: BackendStatus) => void;
  txt2imgParams: Txt2ImgParams;
  setTxt2imgParams: (patch: Txt2ImgParams) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: { kind: 'idle' },
  setStatus: (status) => set({ status }),
  txt2imgParams: { ...txt2imgDefaults },
  setTxt2imgParams: (patch) => set((s) => ({ txt2imgParams: { ...s.txt2imgParams, ...patch } })),
}));

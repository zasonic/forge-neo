import { create } from 'zustand';
import { Txt2ImgPayload, type GenerationResponse } from '@shared/api/schemas.js';

type FormState = Txt2ImgPayload;

interface Txt2ImgStore {
  form: FormState;
  lastResult: GenerationResponse | null;
  showPreview: boolean;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setResult: (r: GenerationResponse) => void;
  setShowPreview: (b: boolean) => void;
  randomSeed: () => void;
  recycleSeed: () => void;
  appendToPrompt: (text: string) => void;
}

const initialForm: FormState = Txt2ImgPayload.parse({ prompt: '' });

export const useTxt2ImgStore = create<Txt2ImgStore>((set, get) => ({
  form: initialForm,
  lastResult: null,
  showPreview: false,
  setField: (key, value) =>
    set((s) => ({ form: { ...s.form, [key]: value } })),
  setResult: (r) => set({ lastResult: r }),
  setShowPreview: (b) => set({ showPreview: b }),
  randomSeed: () => set((s) => ({ form: { ...s.form, seed: -1 } })),
  recycleSeed: () => {
    const info = get().lastResult?.info;
    if (!info) return;
    try {
      const parsed = JSON.parse(info) as { seed?: number };
      if (typeof parsed.seed === 'number') {
        const newSeed = parsed.seed;
        set((s) => ({ form: { ...s.form, seed: newSeed } }));
      }
    } catch {
      // info wasn't JSON; nothing to recycle
    }
  },
  appendToPrompt: (text) =>
    set((s) => ({
      form: {
        ...s.form,
        prompt: s.form.prompt.length > 0 ? `${s.form.prompt} ${text}` : text,
      },
    })),
}));

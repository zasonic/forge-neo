import { create } from 'zustand';
import {
  Img2ImgPayload,
  type GenerationResponse,
  type Txt2ImgPayload,
} from '@shared/api/schemas.js';
import { useTxt2ImgStore } from './txt2imgStore.js';

type FormState = Img2ImgPayload;

interface Img2ImgStore {
  form: FormState;
  initImagePath: string | null;
  lastResult: GenerationResponse | null;
  showPreview: boolean;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setInitImage: (path: string, base64: string) => void;
  clearInitImage: () => void;
  setResult: (r: GenerationResponse) => void;
  setShowPreview: (b: boolean) => void;
  randomSeed: () => void;
  recycleSeed: () => void;
  appendToPrompt: (text: string) => void;
  loadFromTxt2Img: () => void;
  loadFromTxt2ImgFields: (fields: Partial<Txt2ImgPayload>) => void;
}

const initialForm: FormState = Img2ImgPayload.parse({ prompt: '', init_images: [] });

export const useImg2ImgStore = create<Img2ImgStore>((set, get) => ({
  form: initialForm,
  initImagePath: null,
  lastResult: null,
  showPreview: false,
  setField: (key, value) =>
    set((s) => ({ form: { ...s.form, [key]: value } })),
  setInitImage: (path, base64) =>
    set((s) => ({
      initImagePath: path,
      form: { ...s.form, init_images: [base64] },
    })),
  clearInitImage: () =>
    set((s) => ({ initImagePath: null, form: { ...s.form, init_images: [] } })),
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
  loadFromTxt2Img: () => {
    const src = useTxt2ImgStore.getState().form;
    set((s) => ({
      form: {
        ...s.form,
        prompt: src.prompt,
        negative_prompt: src.negative_prompt,
        sampler_name: src.sampler_name,
        scheduler: src.scheduler,
        steps: src.steps,
        cfg_scale: src.cfg_scale,
        width: src.width,
        height: src.height,
        seed: src.seed,
        batch_size: src.batch_size,
        n_iter: src.n_iter,
      },
    }));
  },
  loadFromTxt2ImgFields: (f) => {
    set((s) => ({
      form: {
        ...s.form,
        ...(f.prompt !== undefined && { prompt: f.prompt }),
        ...(f.negative_prompt !== undefined && { negative_prompt: f.negative_prompt }),
        ...(f.sampler_name !== undefined && { sampler_name: f.sampler_name }),
        ...(f.scheduler !== undefined && { scheduler: f.scheduler }),
        ...(f.steps !== undefined && { steps: f.steps }),
        ...(f.cfg_scale !== undefined && { cfg_scale: f.cfg_scale }),
        ...(f.width !== undefined && { width: f.width }),
        ...(f.height !== undefined && { height: f.height }),
        ...(f.seed !== undefined && { seed: f.seed }),
        // denoising_strength on txt2img refers to hires-fix; for img2img it's
        // the core knob. Only adopt if the source explicitly enabled hires
        // (otherwise it'd overwrite the img2img default with an unrelated value).
        ...(f.enable_hr && f.denoising_strength !== undefined && {
          denoising_strength: f.denoising_strength,
        }),
      },
    }));
  },
}));

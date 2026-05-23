import { create } from 'zustand';
import {
  Img2ImgPayload,
  type GenerationResponse,
  type PngInfoResult,
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
  loadFromMetadata: (info: PngInfoResult) => void;
}

const initialForm: FormState = Img2ImgPayload.parse({ prompt: '', init_images: [] });

function parseIntOr<T>(s: string | undefined, fallback: T): number | T {
  if (s == null) return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatOr<T>(s: string | undefined, fallback: T): number | T {
  if (s == null) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function parseSize(s: string | undefined): { width?: number; height?: number } {
  if (!s) return {};
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(s.trim());
  if (!m) return {};
  return { width: Number(m[1]), height: Number(m[2]) };
}

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
  loadFromMetadata: (info) => {
    const p = info.parameters;
    const { width, height } = parseSize(p.Size);
    set((s) => ({
      form: {
        ...s.form,
        prompt: info.prompt,
        negative_prompt: info.negativePrompt,
        sampler_name: p.Sampler ?? s.form.sampler_name,
        scheduler: p['Schedule type'] ?? s.form.scheduler,
        steps: parseIntOr(p.Steps, s.form.steps),
        cfg_scale: parseFloatOr(p['CFG scale'], s.form.cfg_scale),
        seed: parseIntOr(p.Seed, s.form.seed),
        width: width ?? s.form.width,
        height: height ?? s.form.height,
      },
    }));
  },
}));

import { useMemo } from 'react';
import { z, type ZodTypeAny } from 'zod';
import {
  Embedding,
  GenerationResponse,
  Lora,
  OptionsResponse,
  ProgressResponse,
  Sampler,
  Scheduler,
  SdModel,
  Txt2ImgPayload,
  Upscaler,
} from '@shared/api/schemas.js';
import type { BackendStatus } from '@shared/ipc/contract.js';
import { useAppStore } from './store.js';

export class BackendNotReadyError extends Error {
  constructor(public readonly state: BackendStatus['kind']) {
    super(`backend not ready (state: ${state})`);
    this.name = 'BackendNotReadyError';
  }
}

export class ForgeApiError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`forge api ${status}: ${body.slice(0, 200)}`);
    this.name = 'ForgeApiError';
  }
}

async function getJson<S extends ZodTypeAny>(
  baseUrl: string,
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.infer<S>> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ForgeApiError(res.status, body);
  }
  const json: unknown = await res.json();
  return schema.parse(json);
}

export interface ForgeApi {
  baseUrl: string;
  getSdModels(): Promise<SdModel[]>;
  getSamplers(): Promise<Sampler[]>;
  getSchedulers(): Promise<Scheduler[]>;
  getUpscalers(): Promise<Upscaler[]>;
  getOptions(): Promise<OptionsResponse>;
  setModel(title: string): Promise<void>;
  txt2img(payload: Txt2ImgPayload): Promise<z.infer<typeof GenerationResponse>>;
  getProgress(skipCurrentImage?: boolean): Promise<z.infer<typeof ProgressResponse>>;
  interrupt(): Promise<void>;
  getLoras(): Promise<Lora[]>;
  getEmbeddings(): Promise<Embedding[]>;
}

export function createForgeApi(baseUrl: string): ForgeApi {
  return {
    baseUrl,
    getSdModels: () => getJson(baseUrl, '/sdapi/v1/sd-models', z.array(SdModel)),
    getSamplers: () => getJson(baseUrl, '/sdapi/v1/samplers', z.array(Sampler)),
    getSchedulers: () => getJson(baseUrl, '/sdapi/v1/schedulers', z.array(Scheduler)),
    getUpscalers: () => getJson(baseUrl, '/sdapi/v1/upscalers', z.array(Upscaler)),
    getOptions: () => getJson(baseUrl, '/sdapi/v1/options', OptionsResponse),
    setModel: async (title: string): Promise<void> => {
      const res = await fetch(`${baseUrl}/sdapi/v1/options`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sd_model_checkpoint: title }),
      });
      if (!res.ok) {
        throw new ForgeApiError(res.status, await res.text().catch(() => ''));
      }
    },
    txt2img: (payload) =>
      getJson(baseUrl, '/sdapi/v1/txt2img', GenerationResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getProgress: (skipCurrentImage = true) =>
      getJson(
        baseUrl,
        `/sdapi/v1/progress?skip_current_image=${skipCurrentImage ? 'true' : 'false'}`,
        ProgressResponse,
      ),
    interrupt: async (): Promise<void> => {
      const res = await fetch(`${baseUrl}/sdapi/v1/interrupt`, { method: 'POST' });
      if (!res.ok) {
        throw new ForgeApiError(res.status, await res.text().catch(() => ''));
      }
    },
    getLoras: () => getJson(baseUrl, '/sdapi/v1/loras', z.array(Lora)),
    getEmbeddings: () =>
      getJson(
        baseUrl,
        '/sdapi/v1/embeddings',
        z.object({
          loaded: z.record(Embedding).default({}),
          skipped: z.record(Embedding).default({}),
        }).transform((d) => [...Object.values(d.loaded), ...Object.values(d.skipped)]),
      ),
  };
}

export function useForgeApi(): ForgeApi | null {
  const status = useAppStore((s) => s.status);
  const baseUrl = status.kind === 'ready' ? status.baseUrl : null;
  return useMemo(() => (baseUrl ? createForgeApi(baseUrl) : null), [baseUrl]);
}

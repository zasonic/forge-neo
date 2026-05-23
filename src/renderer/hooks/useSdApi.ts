import { useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { z } from 'zod';
import {
  CmdFlags,
  Extension,
  ExtensionToggleResponse,
  type ExtrasSinglePayload,
  ExtrasSingleResponse,
  GenerationResponse,
  Lora,
  type ModelMergerPayload,
  ModelMergerResponse,
  OptionMetadata,
  OptionsResponse,
  PngInfoApiResponse,
  ProgressResponse,
  Sampler,
  Scheduler,
  SdModel,
  type Txt2ImgPayload,
  Upscaler,
} from '@shared/api/schemas.js';
import { apiFetch, type ApiContext } from '../lib/apiClient.js';
import { queryKeys } from '../lib/queryKeys.js';
import { useApiContext } from './useApiContext.js';

const SdModels = z.array(SdModel);
const Samplers = z.array(Sampler);
const Schedulers = z.array(Scheduler);
const Upscalers = z.array(Upscaler);
const Loras = z.array(Lora);
const Extensions = z.array(Extension);
const OptionsSchema = z.array(OptionMetadata);
const Empty = z.unknown();

function ensureCtx(ctx: ApiContext | null): ApiContext {
  if (!ctx) throw new Error('Backend not ready');
  return ctx;
}

export function useSdModels(): UseQueryResult<SdModel[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.sdModels,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/sd-models', SdModels),
    enabled: ctx != null,
    staleTime: 30_000,
  });
}

export function useOptions(): UseQueryResult<OptionsResponse> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.options,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/options', OptionsResponse),
    enabled: ctx != null,
    staleTime: 10_000,
  });
}

export function useSamplers(): UseQueryResult<Sampler[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.samplers,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/samplers', Samplers),
    enabled: ctx != null,
    staleTime: 5 * 60_000,
  });
}

export function useSchedulers(): UseQueryResult<Scheduler[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.schedulers,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/schedulers', Schedulers),
    enabled: ctx != null,
    staleTime: 5 * 60_000,
  });
}

export function useUpscalers(): UseQueryResult<Upscaler[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.upscalers,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/upscalers', Upscalers),
    enabled: ctx != null,
    staleTime: 5 * 60_000,
  });
}

export function useCmdFlags(): UseQueryResult<Record<string, unknown>> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.cmdFlags,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/cmd-flags', CmdFlags),
    enabled: ctx != null,
    staleTime: Infinity,
  });
}

export function useLoras(): UseQueryResult<Lora[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.loras,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/loras', Loras),
    enabled: ctx != null,
    staleTime: 60_000,
  });
}

export function useExtensions(): UseQueryResult<Extension[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.extensions,
    queryFn: () => apiFetch(ensureCtx(ctx), '/sdapi/v1/extensions', Extensions),
    enabled: ctx != null,
    staleTime: 30_000,
  });
}

export function useOptionsSchema(): UseQueryResult<OptionMetadata[]> {
  const ctx = useApiContext();
  return useQuery({
    queryKey: queryKeys.optionsSchema,
    queryFn: () =>
      apiFetch(ensureCtx(ctx), '/forge-neo/options-schema', OptionsSchema),
    enabled: ctx != null,
    staleTime: Infinity,
  });
}

export interface UseProgressOptions {
  enabled: boolean;
  intervalMs?: number;
  includePreview?: boolean;
}

export function useProgress({
  enabled,
  intervalMs = 500,
  includePreview = false,
}: UseProgressOptions): UseQueryResult<ProgressResponse> {
  const ctx = useApiContext();
  const skip = includePreview ? 'false' : 'true';
  return useQuery({
    queryKey: [...queryKeys.progress, skip],
    queryFn: () =>
      apiFetch(
        ensureCtx(ctx),
        `/sdapi/v1/progress?skip_current_image=${skip}`,
        ProgressResponse,
      ),
    enabled: enabled && ctx != null,
    refetchInterval: enabled ? intervalMs : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
    gcTime: 0,
  });
}

export type UseTxt2ImgResult = UseMutationResult<
  GenerationResponse,
  Error,
  Txt2ImgPayload
> & {
  abort: () => void;
};

export function useTxt2Img(): UseTxt2ImgResult {
  const ctx = useApiContext();
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<GenerationResponse, Error, Txt2ImgPayload>({
    mutationKey: ['txt2img'],
    mutationFn: async (payload) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      return apiFetch(
        ensureCtx(ctx),
        '/sdapi/v1/txt2img',
        GenerationResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    },
    onSettled: () => {
      controllerRef.current = null;
      queryClient.removeQueries({ queryKey: queryKeys.progress });
    },
  });

  // The abort closure is invoked only from event handlers; the ref is never
  // read during render. See PromptPanel's Interrupt button.
  // eslint-disable-next-line react-hooks/refs
  return Object.assign(mutation, {
    abort: () => controllerRef.current?.abort(),
  });
}

export function useInterrupt(): UseMutationResult<unknown, Error, void> {
  const ctx = useApiContext();
  return useMutation<unknown, Error, void>({
    mutationKey: ['interrupt'],
    mutationFn: () =>
      apiFetch(ensureCtx(ctx), '/sdapi/v1/interrupt', Empty, { method: 'POST' }),
  });
}

export type UseExtrasSingleResult = UseMutationResult<
  ExtrasSingleResponse,
  Error,
  ExtrasSinglePayload
> & {
  abort: () => void;
};

export function useExtrasSingle(): UseExtrasSingleResult {
  const ctx = useApiContext();
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<ExtrasSingleResponse, Error, ExtrasSinglePayload>({
    mutationKey: ['extras-single'],
    mutationFn: async (payload) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      return apiFetch(
        ensureCtx(ctx),
        '/sdapi/v1/extra-single-image',
        ExtrasSingleResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    },
    onSettled: () => {
      controllerRef.current = null;
    },
  });

  // eslint-disable-next-line react-hooks/refs
  return Object.assign(mutation, {
    abort: () => controllerRef.current?.abort(),
  });
}

export function usePngInfoApi(): UseMutationResult<
  PngInfoApiResponse,
  Error,
  { image: string }
> {
  const ctx = useApiContext();
  return useMutation<PngInfoApiResponse, Error, { image: string }>({
    mutationKey: ['png-info-api'],
    mutationFn: (payload) =>
      apiFetch(ensureCtx(ctx), '/sdapi/v1/png-info', PngInfoApiResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useModelMerge(): UseMutationResult<
  ModelMergerResponse,
  Error,
  ModelMergerPayload
> {
  const ctx = useApiContext();
  const queryClient = useQueryClient();
  return useMutation<ModelMergerResponse, Error, ModelMergerPayload>({
    mutationKey: ['model-merge'],
    mutationFn: (payload) =>
      apiFetch(ensureCtx(ctx), '/forge-neo/modelmerger', ModelMergerResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sdModels });
    },
  });
}

export function useToggleExtension(): UseMutationResult<
  ExtensionToggleResponse,
  Error,
  { name: string; enabled: boolean }
> {
  const ctx = useApiContext();
  const queryClient = useQueryClient();
  return useMutation<ExtensionToggleResponse, Error, { name: string; enabled: boolean }>({
    mutationKey: ['extension-toggle'],
    mutationFn: ({ name, enabled }) =>
      apiFetch(
        ensureCtx(ctx),
        `/forge-neo/extensions/${encodeURIComponent(name)}/toggle`,
        ExtensionToggleResponse,
        {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.extensions });
    },
  });
}

export function useSetOptions(): UseMutationResult<
  unknown,
  Error,
  Record<string, unknown>
> {
  const ctx = useApiContext();
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, Record<string, unknown>>({
    mutationKey: ['set-options'],
    mutationFn: (patch) =>
      apiFetch(ensureCtx(ctx), '/sdapi/v1/options', Empty, {
        method: 'POST',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.options });
    },
  });
}

function makeRefresh(path: string, key: string) {
  return function useRefresh(): UseMutationResult<unknown, Error, void> {
    const ctx = useApiContext();
    return useMutation<unknown, Error, void>({
      mutationKey: [key],
      mutationFn: () =>
        apiFetch(ensureCtx(ctx), path, Empty, { method: 'POST' }),
    });
  };
}

export const useRefreshCheckpoints = makeRefresh(
  '/sdapi/v1/refresh-checkpoints',
  'refresh-checkpoints',
);
export const useRefreshVae = makeRefresh('/sdapi/v1/refresh-vae', 'refresh-vae');
export const useRefreshEmbeddings = makeRefresh(
  '/sdapi/v1/refresh-embeddings',
  'refresh-embeddings',
);
export const useRefreshLoras = makeRefresh(
  '/forge-neo/refresh-loras',
  'refresh-loras',
);

interface SetCheckpointContext {
  prev: OptionsResponse | undefined;
}

export function useSetCheckpoint(): UseMutationResult<
  unknown,
  Error,
  string,
  SetCheckpointContext
> {
  const ctx = useApiContext();
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, string, SetCheckpointContext>({
    mutationKey: ['setCheckpoint'],
    mutationFn: (title) =>
      apiFetch(ensureCtx(ctx), '/sdapi/v1/options', Empty, {
        method: 'POST',
        body: JSON.stringify({ sd_model_checkpoint: title }),
      }),
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.options });
      const prev = queryClient.getQueryData<OptionsResponse>(queryKeys.options);
      if (prev) {
        queryClient.setQueryData<OptionsResponse>(queryKeys.options, {
          ...prev,
          sd_model_checkpoint: title,
        });
      }
      return { prev };
    },
    onError: (_err, _title, restore) => {
      if (restore?.prev) {
        queryClient.setQueryData(queryKeys.options, restore.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.options });
    },
  });
}

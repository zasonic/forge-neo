import { useEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Txt2ImgPayload, type GenerationResponse, type ProgressResponse } from '@shared/api/schemas.js';
import { useAppStore, txt2imgDefaults, type Txt2ImgParams } from '../../lib/store.js';
import { useForgeApi, type ForgeApi } from '../../lib/api.js';

const PROGRESS_POLL_MS = 500;

export function Txt2ImgPage(): ReactElement {
  const api = useForgeApi();
  if (!api) {
    return (
      <div className="h-full flex items-center justify-center text-white/60 text-sm">
        Backend not ready. Start it from the status bar below.
      </div>
    );
  }
  return <Txt2ImgReady api={api} />;
}

function Txt2ImgReady({ api }: { api: ForgeApi }): ReactElement {
  const params = useAppStore((s) => s.txt2imgParams);
  const setParams = useAppStore((s) => s.setTxt2imgParams);
  const qc = useQueryClient();

  const models = useQuery({
    queryKey: ['sd-models', api.baseUrl],
    queryFn: () => api.getSdModels(),
  });
  const samplers = useQuery({
    queryKey: ['samplers', api.baseUrl],
    queryFn: () => api.getSamplers(),
  });
  const schedulers = useQuery({
    queryKey: ['schedulers', api.baseUrl],
    queryFn: () => api.getSchedulers(),
  });
  const options = useQuery({
    queryKey: ['options', api.baseUrl],
    queryFn: () => api.getOptions(),
  });
  const upscalers = useQuery({
    queryKey: ['upscalers', api.baseUrl],
    queryFn: () => api.getUpscalers(),
    enabled: Boolean(params.enable_hr),
  });

  const setModel = useMutation({
    mutationFn: (title: string) => api.setModel(title),
    onSettled: () => qc.invalidateQueries({ queryKey: ['options', api.baseUrl] }),
  });

  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const imagesRef = useRef<string[]>([]);
  const mountedRef = useRef(true);

  const replaceImages = (next: string[]): void => {
    for (const url of imagesRef.current) URL.revokeObjectURL(url);
    imagesRef.current = next;
    if (mountedRef.current) setImages(next);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const url of imagesRef.current) URL.revokeObjectURL(url);
      imagesRef.current = [];
    };
  }, []);

  const generate = useMutation({
    mutationFn: async () => {
      const merged: Txt2ImgParams = { ...txt2imgDefaults, ...params };
      if (!params.sampler_name && samplers.data) {
        const euler = samplers.data.find((s) => s.name === 'Euler a');
        merged.sampler_name = euler?.name ?? samplers.data[0]?.name;
      }
      if (!params.scheduler && schedulers.data) {
        merged.scheduler = schedulers.data[0]?.name;
      }
      const payload = Txt2ImgPayload.parse(merged);
      return api.txt2img(payload);
    },
    onMutate: () => {
      setProgress(null);
      setInfo(null);
    },
    onSuccess: async (data: GenerationResponse) => {
      const next: string[] = [];
      for (const b64 of data.images) {
        if (!b64) continue;
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        next.push(URL.createObjectURL(blob));
      }
      if (!mountedRef.current) {
        for (const url of next) URL.revokeObjectURL(url);
        return;
      }
      replaceImages(next);
      setInfo(data.info);
    },
  });

  useEffect(() => {
    if (!generate.isPending) return;
    let cancelled = false;
    const tick = async (): Promise<void> => {
      try {
        const p = await api.getProgress(true);
        if (!cancelled) setProgress(p);
      } catch {
        // ignore — backend may briefly 5xx mid-step
      }
    };
    void tick();
    const id = setInterval(() => void tick(), PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [generate.isPending, api]);

  const activeCheckpoint = options.data?.sd_model_checkpoint;

  return (
    <div className="h-full flex">
      <section className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <Field label="Prompt">
          <textarea
            className={textareaClass}
            rows={4}
            value={params.prompt ?? ''}
            onChange={(e) => setParams({ prompt: e.target.value })}
            placeholder="A photo of…"
          />
        </Field>

        <Field label="Negative prompt">
          <textarea
            className={textareaClass}
            rows={2}
            value={params.negative_prompt ?? ''}
            onChange={(e) => setParams({ negative_prompt: e.target.value })}
          />
        </Field>

        <Field label="Model" hint={models.isFetching ? 'loading…' : undefined}>
          <select
            className={selectClass}
            value={activeCheckpoint ?? ''}
            disabled={setModel.isPending || models.isLoading}
            onChange={(e) => setModel.mutate(e.target.value)}
          >
            {!activeCheckpoint && <option value="">— select a model —</option>}
            {(models.data ?? []).map((m) => (
              <option key={m.title} value={m.title}>
                {m.model_name}
              </option>
            ))}
          </select>
          {setModel.isPending && <div className="text-xs text-white/50 mt-1">switching checkpoint…</div>}
          {setModel.isError && (
            <div className="text-xs text-red-300 mt-1">{(setModel.error as Error).message}</div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sampler">
            <select
              className={selectClass}
              value={params.sampler_name ?? ''}
              onChange={(e) => setParams({ sampler_name: e.target.value || undefined })}
            >
              <option value="">— default —</option>
              {(samplers.data ?? []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Scheduler">
            <select
              className={selectClass}
              value={params.scheduler ?? ''}
              onChange={(e) => setParams({ scheduler: e.target.value || undefined })}
            >
              <option value="">— default —</option>
              {(schedulers.data ?? []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label ?? s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumField
            label="Steps"
            value={params.steps ?? 20}
            min={1}
            max={150}
            step={1}
            onChange={(v) => setParams({ steps: v })}
          />
          <NumField
            label="CFG scale"
            value={params.cfg_scale ?? 7}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => setParams({ cfg_scale: v })}
          />
          <NumField
            label="Seed"
            value={params.seed ?? -1}
            step={1}
            onChange={(v) => setParams({ seed: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Width"
            value={params.width ?? 512}
            min={64}
            step={8}
            snapToMultiple={8}
            onChange={(v) => setParams({ width: v })}
          />
          <NumField
            label="Height"
            value={params.height ?? 512}
            min={64}
            step={8}
            snapToMultiple={8}
            onChange={(v) => setParams({ height: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Batch size"
            value={params.batch_size ?? 1}
            min={1}
            max={8}
            step={1}
            onChange={(v) => setParams({ batch_size: v })}
          />
          <NumField
            label="Batch count"
            value={params.n_iter ?? 1}
            min={1}
            max={100}
            step={1}
            onChange={(v) => setParams({ n_iter: v })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm pt-2">
          <input
            type="checkbox"
            checked={Boolean(params.enable_hr)}
            onChange={(e) => setParams({ enable_hr: e.target.checked })}
          />
          Hires fix
        </label>

        {params.enable_hr && (
          <div className="space-y-3 pl-5 border-l border-border">
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Upscale by"
                value={params.hr_scale ?? 2}
                min={1}
                max={4}
                step={0.05}
                onChange={(v) => setParams({ hr_scale: v })}
              />
              <NumField
                label="Denoising strength"
                value={params.denoising_strength ?? 0.7}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => setParams({ denoising_strength: v })}
              />
            </div>
            <Field label="Upscaler" hint={upscalers.isFetching ? 'loading…' : undefined}>
              <select
                className={selectClass}
                value={params.hr_upscaler ?? ''}
                onChange={(e) => setParams({ hr_upscaler: e.target.value || undefined })}
              >
                <option value="">— default —</option>
                {(upscalers.data ?? []).map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="px-3 py-2 rounded bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={generate.isPending || !(params.prompt ?? '').trim()}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? 'Generating…' : 'Generate'}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!generate.isPending}
            onClick={() => void api.interrupt()}
          >
            Interrupt
          </button>
        </div>

        {generate.isError && (
          <div className="text-xs text-red-300">{(generate.error as Error).message}</div>
        )}
      </section>

      <aside className="w-[520px] shrink-0 border-l border-border p-4 flex flex-col gap-3 overflow-y-auto">
        <ProgressBar progress={progress} generating={generate.isPending} />
        <div className="flex-1 flex flex-col gap-3">
          {images.length === 0 && !generate.isPending && (
            <div className="flex-1 grid place-items-center text-white/40 text-sm border border-dashed border-border rounded">
              Output appears here.
            </div>
          )}
          {images.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`result ${i + 1}`}
              className="w-full rounded border border-border bg-bg-subtle"
            />
          ))}
        </div>
        {info && (
          <details className="text-xs text-white/60">
            <summary className="cursor-pointer">Generation info</summary>
            <pre className="whitespace-pre-wrap break-all mt-2 p-2 bg-bg-subtle rounded">
              {info}
            </pre>
          </details>
        )}
      </aside>
    </div>
  );
}

function ProgressBar({
  progress,
  generating,
}: {
  progress: ProgressResponse | null;
  generating: boolean;
}): ReactElement | null {
  if (!generating && !progress) return null;
  const pct = Math.max(0, Math.min(1, progress?.progress ?? 0)) * 100;
  const step = progress?.state.sampling_step;
  const steps = progress?.state.sampling_steps;
  const eta = progress?.eta_relative;
  return (
    <div className="space-y-1">
      <div className="h-2 bg-bg-subtle rounded overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-white/60">
        <span>
          {step != null && steps != null ? `${step}/${steps}` : generating ? 'starting…' : ''}
        </span>
        <span>{eta != null && eta > 0 ? `${eta.toFixed(1)}s` : ''}</span>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-bg-subtle border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent';
const textareaClass = `${inputClass} resize-y`;
const selectClass = inputClass;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-white/60 mb-1">
        <span>{label}</span>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  step = 1,
  snapToMultiple,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  snapToMultiple?: number;
  onChange: (v: number) => void;
}): ReactElement {
  const handle = (e: ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange(n);
  };
  const blur = (): void => {
    if (snapToMultiple) {
      const snapped = Math.round(value / snapToMultiple) * snapToMultiple;
      if (snapped !== value) onChange(snapped);
    }
  };
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputClass}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handle}
        onBlur={blur}
      />
    </Field>
  );
}

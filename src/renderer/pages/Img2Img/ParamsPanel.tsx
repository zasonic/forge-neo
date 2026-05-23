import { useEffect, type ReactElement } from 'react';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';
import { useSamplers, useSchedulers } from '../../hooks/useSdApi.js';
import { Field } from '../Txt2Img/Field.js';

export function ParamsPanel(): ReactElement {
  const form = useImg2ImgStore((s) => s.form);
  const setField = useImg2ImgStore((s) => s.setField);
  const randomSeed = useImg2ImgStore((s) => s.randomSeed);
  const recycleSeed = useImg2ImgStore((s) => s.recycleSeed);
  const showPreview = useImg2ImgStore((s) => s.showPreview);
  const setShowPreview = useImg2ImgStore((s) => s.setShowPreview);
  const samplers = useSamplers();
  const schedulers = useSchedulers();

  useEffect(() => {
    const first = samplers.data?.[0];
    if (form.sampler_name == null && first) {
      setField('sampler_name', first.name);
    }
  }, [samplers.data, form.sampler_name, setField]);

  useEffect(() => {
    const first = schedulers.data?.[0];
    if (form.scheduler == null && first) {
      setField('scheduler', first.name);
    }
  }, [schedulers.data, form.scheduler, setField]);

  return (
    <div className="p-4 space-y-4 text-sm">
      <Field label="Denoising strength" hint={form.denoising_strength.toFixed(2)}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={form.denoising_strength}
          onChange={(e) => setField('denoising_strength', Number(e.target.value))}
          className="w-full"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sampler">
          <select
            value={form.sampler_name ?? ''}
            onChange={(e) => setField('sampler_name', e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          >
            {!samplers.data && <option value="">loading…</option>}
            {samplers.data?.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scheduler">
          <select
            value={form.scheduler ?? ''}
            onChange={(e) => setField('scheduler', e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          >
            {!schedulers.data && <option value="">loading…</option>}
            {schedulers.data?.map((s) => (
              <option key={s.name} value={s.name}>
                {s.label ?? s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Steps">
          <input
            type="number"
            min={1}
            max={150}
            value={form.steps}
            onChange={(e) => setField('steps', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          />
        </Field>
        <Field label="CFG scale">
          <input
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={form.cfg_scale}
            onChange={(e) => setField('cfg_scale', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          />
        </Field>
        <Field label="Width">
          <DimensionInput value={form.width} onChange={(v) => setField('width', v)} />
        </Field>
        <Field label="Height">
          <DimensionInput value={form.height} onChange={(v) => setField('height', v)} />
        </Field>
        <Field label="Batch size">
          <input
            type="number"
            min={1}
            max={8}
            value={form.batch_size}
            onChange={(e) => setField('batch_size', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          />
        </Field>
        <Field label="Batch count">
          <input
            type="number"
            min={1}
            max={100}
            value={form.n_iter}
            onChange={(e) => setField('n_iter', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
          />
        </Field>
      </div>

      <Field label="Seed">
        <div className="flex gap-2">
          <input
            type="number"
            value={form.seed}
            onChange={(e) => setField('seed', Number(e.target.value))}
            className="flex-1 px-2 py-1.5 rounded bg-bg-panel border border-border"
          />
          <button
            type="button"
            onClick={randomSeed}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
            title="Random (-1)"
          >
            Random
          </button>
          <button
            type="button"
            onClick={recycleSeed}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
            title="Recycle seed from last result"
          >
            Recycle
          </button>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={showPreview}
          onChange={(e) => setShowPreview(e.target.checked)}
        />
        Live preview during generation
      </label>
    </div>
  );
}

function DimensionInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): ReactElement {
  return (
    <input
      type="number"
      step={8}
      min={64}
      max={2048}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isFinite(v)) return;
        onChange(v - (v % 8));
      }}
      className="w-full px-2 py-1.5 rounded bg-bg-panel border border-border"
    />
  );
}

import { useState, type ReactElement } from 'react';
import { useModelMerge, useSdModels } from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';
import type { ModelMergerPayload } from '@shared/api/schemas.js';

type InterpMethod = ModelMergerPayload['interp_method'];
type CkptFormat = ModelMergerPayload['checkpoint_format'];

export function ModelMergerPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const models = useSdModels();
  const merge = useModelMerge();

  const list = models.data ?? [];
  const defaultPrimary = list[0]?.title ?? '';
  const defaultSecondary = list[Math.min(1, list.length - 1)]?.title ?? '';

  const [primary, setPrimary] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const [tertiary, setTertiary] = useState('');
  const [mode, setMode] = useState<InterpMethod>('Weighted sum');
  const [alpha, setAlpha] = useState(0.5);
  const [customName, setCustomName] = useState('');
  const [format, setFormat] = useState<CkptFormat>('safetensors');
  const [saveHalf, setSaveHalf] = useState(false);
  const [discardWeights, setDiscardWeights] = useState('');

  const primaryValue = primary ?? defaultPrimary;
  const secondaryValue = secondary ?? defaultSecondary;

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to merge models.
      </div>
    );
  }

  const submit = (): void => {
    if (!primaryValue || !secondaryValue) return;
    merge.mutate({
      primary_model_name: primaryValue,
      secondary_model_name: secondaryValue,
      tertiary_model_name: mode === 'Add difference' ? tertiary : '',
      interp_method: mode,
      multiplier: alpha,
      save_as_half: saveHalf,
      custom_name: customName,
      checkpoint_format: format,
      config_source: 0,
      bake_in_vae: '',
      discard_weights: discardWeights,
      save_metadata: true,
    });
  };

  const titles = list.map((m) => m.title);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Model Merger</h1>
          <p className="text-white/60 text-sm mt-1">
            Combine two or three checkpoints into a new one. The result is
            saved to your models folder.
          </p>
        </header>

        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <ModelSelect
              label="Primary (A)"
              value={primaryValue}
              onChange={setPrimary}
              options={titles}
            />
            <ModelSelect
              label="Secondary (B)"
              value={secondaryValue}
              onChange={setSecondary}
              options={titles}
            />
            <ModelSelect
              label="Tertiary (C)"
              value={tertiary}
              onChange={setTertiary}
              options={titles}
              disabled={mode !== 'Add difference'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-white/60">Interpolation method</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as InterpMethod)}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              >
                <option value="Weighted sum">Weighted sum — A*(1-M) + B*M</option>
                <option value="Add difference">Add difference — A + (B-C)*M</option>
                <option value="No interpolation">No interpolation</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-white/60">
                Multiplier M ({alpha.toFixed(2)})
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-white/60">Custom name (optional)</span>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="leave blank for auto"
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-white/60">Format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CkptFormat)}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              >
                <option value="safetensors">safetensors</option>
                <option value="ckpt">ckpt</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-white/60">Discard weights (regex)</span>
            <input
              type="text"
              value={discardWeights}
              onChange={(e) => setDiscardWeights(e.target.value)}
              placeholder="e.g. model_ema (optional)"
              className="px-2 py-1.5 rounded bg-bg-panel border border-border"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={saveHalf}
              onChange={(e) => setSaveHalf(e.target.checked)}
            />
            Save as fp16 (smaller file, lower precision)
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!primaryValue || !secondaryValue || merge.isPending}
              className="px-4 py-2 rounded bg-accent text-accent-fg disabled:opacity-50"
            >
              {merge.isPending ? 'Merging…' : 'Run merge'}
            </button>
          </div>

          {merge.isError && (
            <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
              {merge.error.message}
            </div>
          )}
          {merge.data && (
            <div className="text-sm text-emerald-300 rounded bg-emerald-500/10 border border-emerald-500/30 p-3 whitespace-pre-wrap">
              {merge.data.info}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ModelSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-white/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1.5 rounded bg-bg-panel border border-border disabled:opacity-40"
      >
        <option value="">(none)</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

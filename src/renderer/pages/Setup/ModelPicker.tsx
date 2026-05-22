import { useEffect, useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ModelOption } from '@shared/ipc/contract.js';

// Mirror of HIDDEN_BY_DEFAULT in src/main/setup/manifests.ts. Anything
// not in this set is shown by default; the set lives behind "Show all".
const HIDDEN_BY_DEFAULT = new Set([
  'download-turbo',
  'download-flux1-dev-nf4-v2',
  'download-flux1-schnell-nf4',
  'download-flux-kontext',
  'download-qwen-image',
  'download-qwen-image-edit',
  'download-neta-lumina',
  'download-netayume-lumina',
  'download-wan2_1-t2v-1_3B',
  'download-wan2_2-t2v-14B',
  'download-wan2_2-i2v-14B',
]);

export function ModelPicker({ onConfirm }: { onConfirm: () => void }): ReactElement {
  const q = useQuery<ModelOption[]>({
    queryKey: ['model-options'],
    queryFn: () => window.forge.setup.listModels(),
    staleTime: Infinity,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data && selected.size === 0) {
      // Pre-select nothing; user must opt-in.
    }
  }, [q.data, selected.size]);

  if (q.isLoading || !q.data) return <div className="text-sm text-white/50">Loading options…</div>;
  const visible = q.data.filter((o) => showAll || !HIDDEN_BY_DEFAULT.has(o.id));
  const totalGb = q.data.filter((o) => selected.has(o.id)).reduce((sum, o) => sum + o.sizeGb, 0);

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async (): Promise<void> => {
    setBusy(true);
    try {
      await window.forge.setup.setSelectedModels(Array.from(selected));
      onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 max-w-xl">
      <h2 className="text-lg font-medium">Starter models <span className="text-white/40 text-sm">(optional)</span></h2>
      <p className="text-sm text-white/60">
        Pick checkpoints to download now. Skip to add them later from the Models page.
      </p>
      <ul className="space-y-1">
        {visible.map((o) => (
          <li
            key={o.id}
            className="flex items-start gap-3 px-3 py-2 rounded bg-bg-subtle border border-border"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(o.id)}
              onChange={() => toggle(o.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm">{o.label}</div>
              <div className="text-xs text-white/40">
                {o.sizeGb.toFixed(1)} GB · {o.license} · {o.files.length} file{o.files.length === 1 ? '' : 's'}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="text-xs text-white/60 hover:text-white"
      >
        {showAll ? 'Hide advanced models' : 'Show all (Flux variants, Qwen, Wan, …)'}
      </button>
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-white/60">
          {selected.size === 0 ? 'Nothing selected — Skip is fine.' : `Total: ~${totalGb.toFixed(1)} GB`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
              void confirm();
            }}
            disabled={busy}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="px-3 py-2 rounded bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40"
          >
            {selected.size === 0 ? 'Continue without downloads' : `Download ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}

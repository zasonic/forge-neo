import type { ReactElement } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';
import { useProgress } from '../../hooks/useSdApi.js';

export function ProgressPanel(): ReactElement | null {
  const isPending = useIsMutating({ mutationKey: ['img2img'] }) > 0;
  const showPreview = useImg2ImgStore((s) => s.showPreview);
  const progress = useProgress({ enabled: isPending, includePreview: showPreview });

  if (!isPending) return null;

  const p = progress.data;
  const pct = p ? Math.max(0, Math.min(1, p.progress)) * 100 : 0;
  const indeterminate = !p || (p.progress < 0.01 && !p.state.sampling_step);
  const eta =
    p?.eta_relative != null && p.eta_relative > 0
      ? `${p.eta_relative.toFixed(1)}s`
      : null;
  const step = p?.state.sampling_step;
  const totalSteps = p?.state.sampling_steps;

  return (
    <div className="p-4 space-y-3 border-b border-border">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Generating…</span>
        <span className="text-white/40">
          {step != null && totalSteps != null && `${step}/${totalSteps}`}
          {eta && ` · ETA ${eta}`}
        </span>
      </div>
      <div className="h-2 rounded bg-white/10 overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 bg-accent/60 animate-pulse" />
        ) : (
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {showPreview && p?.current_image && (
        <img
          src={`data:image/png;base64,${p.current_image}`}
          alt="preview"
          className="w-full rounded border border-border"
        />
      )}
    </div>
  );
}

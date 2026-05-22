import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { PreflightReport } from '@shared/ipc/contract.js';

export function PreflightCard({ onProceed }: { onProceed: () => void }): ReactElement {
  const q = useQuery<PreflightReport>({
    queryKey: ['preflight'],
    queryFn: () => window.forge.setup.preflight(),
    staleTime: 10_000,
  });

  if (q.isLoading || !q.data) {
    return <div className="text-sm text-white/50">Running preflight…</div>;
  }
  const r = q.data;

  return (
    <div className="space-y-3 max-w-xl">
      <h2 className="text-lg font-medium">System check</h2>
      <Row
        label="Free disk space"
        value={r.freeDiskGb != null ? `${r.freeDiskGb.toFixed(1)} GB` : 'unknown'}
        ok={r.freeDiskGb == null || r.freeDiskGb >= r.minFreeDiskGb}
        warn={`${r.minFreeDiskGb} GB recommended`}
      />
      <Row
        label="GPU"
        value={r.gpuName ?? 'not detected'}
        ok={Boolean(r.gpuName)}
        warn="NVIDIA GPU required"
      />
      <Row
        label="Driver"
        value={r.driverVersion ?? 'unknown'}
        ok={
          r.driverVersion == null
            ? false
            : Number(r.driverVersion.split('.')[0] ?? '0') >= r.minDriverVersion
        }
        warn={`${r.minDriverVersion}+ required`}
      />
      <Row
        label="RAM"
        value={r.totalRamGb != null ? `${r.totalRamGb.toFixed(1)} GB` : 'unknown'}
        ok
      />
      <Row label="github.com" value={r.network.github ? 'reachable' : 'unreachable'} ok={r.network.github} />
      <Row label="huggingface.co" value={r.network.huggingface ? 'reachable' : 'unreachable'} ok={r.network.huggingface} />
      <Row label="download.pytorch.org" value={r.network.pytorch ? 'reachable' : 'unreachable'} ok={r.network.pytorch} />

      {r.warnings.length > 0 && (
        <ul className="text-xs text-amber-200/80 space-y-1 pt-2">
          {r.warnings.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="pt-3 flex gap-2">
        <button
          type="button"
          onClick={onProceed}
          disabled={!r.ok}
          className="px-3 py-2 rounded bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => void q.refetch()}
          className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          Re-check
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, ok, warn }: { label: string; value: string; ok: boolean; warn?: string }): ReactElement {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-44 shrink-0 text-white/60">{label}</span>
      <span className={ok ? 'text-emerald-300' : 'text-red-300'}>{value}</span>
      {!ok && warn && <span className="text-xs text-white/40">— {warn}</span>}
    </div>
  );
}

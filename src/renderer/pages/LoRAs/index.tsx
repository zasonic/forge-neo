import { useMemo, useState, type ReactElement } from 'react';
import { useLoras } from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';
import { useApiContext } from '../../hooks/useApiContext.js';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';
import type { Lora } from '@shared/api/schemas.js';

type Target = 'txt2img' | 'img2img';

function getMetaString(lora: Lora, key: string): string | undefined {
  const v = lora.metadata?.[key];
  return typeof v === 'string' ? v : undefined;
}

function getTrainedWords(lora: Lora): string[] {
  const tw = lora.metadata?.trained_words;
  if (Array.isArray(tw)) return tw.filter((w): w is string => typeof w === 'string');
  return [];
}

// LoRA previews live under models/Lora/, outside the forge-img:// protocol's
// outputs-rooted resolution. Fetch them via the extension's HTTP endpoint
// instead. Note: this skips the basic-auth header, so authed installs will
// see broken previews; not a blocker for default deployments.
function previewUrl(baseUrl: string, name: string): string {
  return `${baseUrl}/sdapi/v1/loras/${encodeURIComponent(name)}/preview`;
}

export function LoRAsPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const ctx = useApiContext();
  const loras = useLoras();
  const [filter, setFilter] = useState('');
  const [baseFilter, setBaseFilter] = useState<string>('');
  const [target, setTarget] = useState<Target>('txt2img');
  const [justInserted, setJustInserted] = useState<string | null>(null);

  const allBases = useMemo(() => {
    const set = new Set<string>();
    for (const l of loras.data ?? []) {
      const v = getMetaString(l, 'sd_version');
      if (v) set.add(v);
    }
    return [...set].sort();
  }, [loras.data]);

  const list = useMemo(() => {
    return (loras.data ?? []).filter((l) => {
      if (baseFilter && getMetaString(l, 'sd_version') !== baseFilter) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        (l.alias?.toLowerCase().includes(q) ?? false) ||
        getTrainedWords(l).some((w) => w.toLowerCase().includes(q))
      );
    });
  }, [loras.data, filter, baseFilter]);

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to browse LoRAs.
      </div>
    );
  }

  const insert = (lora: Lora): void => {
    const tag = `<lora:${lora.name}:1>`;
    if (target === 'txt2img') {
      useTxt2ImgStore.getState().appendToPrompt(tag);
    } else {
      useImg2ImgStore.getState().appendToPrompt(tag);
    }
    setJustInserted(lora.name);
    window.setTimeout(() => {
      setJustInserted((cur) => (cur === lora.name ? null : cur));
    }, 1500);
  };

  const baseUrl = ctx?.baseUrl ?? '';

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">LoRAs</h1>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name or trigger…"
          className="flex-1 min-w-[160px] max-w-xs px-3 py-1.5 rounded bg-bg-panel border border-border text-sm"
        />
        {allBases.length > 0 && (
          <select
            value={baseFilter}
            onChange={(e) => setBaseFilter(e.target.value)}
            className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm"
          >
            <option value="">All bases</option>
            {allBases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-white/60">
          <span>Insert into:</span>
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => setTarget('txt2img')}
              className={[
                'px-3 py-1.5',
                target === 'txt2img' ? 'bg-accent text-accent-fg' : 'bg-bg-panel hover:bg-white/10',
              ].join(' ')}
            >
              Txt2Img
            </button>
            <button
              onClick={() => setTarget('img2img')}
              className={[
                'px-3 py-1.5',
                target === 'img2img' ? 'bg-accent text-accent-fg' : 'bg-bg-panel hover:bg-white/10',
              ].join(' ')}
            >
              Img2Img
            </button>
          </div>
          <button
            onClick={() => void loras.refetch()}
            disabled={loras.isFetching}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
          >
            {loras.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {loras.isLoading && (
        <div className="p-4 text-sm text-white/40">Loading LoRAs…</div>
      )}
      {loras.isError && (
        <div className="m-4 text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          {loras.error.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {list.length === 0 && !loras.isLoading && !loras.isError && (
          <div className="text-center py-12 text-sm text-white/40">
            {loras.data && loras.data.length === 0
              ? 'No LoRAs installed.'
              : 'No matches.'}
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {list.map((l) => (
            <Card
              key={l.path ?? l.name}
              lora={l}
              previewSrc={l.preview ? previewUrl(baseUrl, l.name) : null}
              flash={justInserted === l.name}
              onInsert={() => insert(l)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  lora,
  previewSrc,
  flash,
  onInsert,
}: {
  lora: Lora;
  previewSrc: string | null;
  flash: boolean;
  onInsert: () => void;
}): ReactElement {
  const base = getMetaString(lora, 'sd_version');
  const trained = getTrainedWords(lora);

  return (
    <div
      className={[
        'rounded border bg-bg-panel/50 overflow-hidden flex flex-col transition-colors',
        flash ? 'border-accent ring-2 ring-accent/40' : 'border-border',
      ].join(' ')}
    >
      <button
        onClick={onInsert}
        className="block aspect-square overflow-hidden bg-bg-panel relative"
        title={`Insert <lora:${lora.name}:1>`}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={lora.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
            no preview
          </div>
        )}
        {flash && (
          <div className="absolute inset-0 bg-accent/30 flex items-center justify-center text-xs font-semibold">
            Inserted
          </div>
        )}
      </button>
      <div className="p-2 space-y-1 flex-1 flex flex-col">
        <div className="text-sm font-medium truncate" title={lora.name}>
          {lora.name}
        </div>
        {base && (
          <div className="inline-block self-start px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">
            {base}
          </div>
        )}
        {trained.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {trained.slice(0, 4).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[10px] bg-bg-subtle text-white/60"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {lora.path && (
          <button
            onClick={() => void window.forge.shell.showItemInFolder(lora.path!)}
            className="text-[10px] text-white/40 hover:text-white/70 text-left"
          >
            Open in folder
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PngInfoResult } from '@shared/api/schemas.js';
import { useAppStore } from '../../lib/store.js';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';
import { fileUrl } from '../../lib/fileUrl.js';
import { ThumbGrid } from './ThumbGrid.js';
import { DetailPanel } from './DetailPanel.js';

export interface OutputEntry {
  path: string;
  mtimeMs: number;
  sizeBytes: number;
}

const OUTPUTS_KEY = ['outputs'] as const;
const PNG_INFO_KEY = ['pngInfo'] as const;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const idx = result.indexOf('base64,');
      resolve(idx === -1 ? result : result.slice(idx + 'base64,'.length));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export function GalleryPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<OutputEntry | null>(null);

  const entries = useQuery({
    queryKey: OUTPUTS_KEY,
    queryFn: () => window.forge.fs.scanOutputs(),
    enabled: status.kind === 'ready',
    staleTime: 5_000,
  });

  const info = useQuery({
    queryKey: [...PNG_INFO_KEY, selected?.path],
    queryFn: () =>
      selected ? window.forge.fs.readPngInfo(selected.path) : Promise.resolve(null),
    enabled: selected != null,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (status.kind !== 'ready') return;
    void window.forge.fs.watchOutputs();
    const off = window.forge.fs.onOutputsChanged(() => {
      void queryClient.invalidateQueries({ queryKey: OUTPUTS_KEY });
    });
    return off;
  }, [status.kind, queryClient]);

  const sendToTxt2Img = (i: PngInfoResult): void => {
    useTxt2ImgStore.getState().loadFromMetadata(i);
    navigate('/generate/txt2img');
  };

  const sendToImg2Img = async (entry: OutputEntry, i: PngInfoResult | null): Promise<void> => {
    const base64 = await fetchAsBase64(fileUrl(entry.path));
    useImg2ImgStore.getState().setInitImage(entry.path, base64);
    if (i) useImg2ImgStore.getState().loadFromMetadata(i);
    navigate('/generate/img2img');
  };

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to browse the gallery.
      </div>
    );
  }

  const list = entries.data ?? [];
  const infoValue: PngInfoResult | null | undefined = info.isLoading
    ? undefined
    : (info.data ?? null);

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <h1 className="text-lg font-semibold">Gallery</h1>
        <span className="text-xs text-white/40">{list.length} files</span>
        <div className="flex-1" />
        <button
          onClick={() => void entries.refetch()}
          disabled={entries.isFetching}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
        >
          {entries.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
      <div className="flex-1 grid grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] min-h-0">
        <div className="overflow-y-auto min-h-0 border-r border-border">
          <ThumbGrid entries={list} selected={selected} onSelect={setSelected} />
        </div>
        <div className="overflow-y-auto min-h-0">
          <DetailPanel
            entry={selected}
            info={selected ? infoValue : null}
            onSendToTxt2Img={sendToTxt2Img}
            onSendToImg2Img={(e, i) => void sendToImg2Img(e, i)}
          />
        </div>
      </div>
    </div>
  );
}

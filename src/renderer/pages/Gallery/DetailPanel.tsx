import { useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OutputEntry } from '@shared/ipc/contract.js';
import { parseGenParams } from '../../lib/parseGenParams.js';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';
import { pathToForgeImg } from './pathToForgeImg.js';
import { useImageMetadata } from './useImageMetadata.js';

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

interface Props {
  entry: OutputEntry | null;
}

function basename(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const i = norm.lastIndexOf('/');
  return i >= 0 ? norm.slice(i + 1) : norm;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '';
  }
}

export function DetailPanel({ entry }: Props): ReactElement {
  const navigate = useNavigate();
  const metadata = useImageMetadata(entry);
  const setField = useTxt2ImgStore((s) => s.setField);
  const [toast, setToast] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (metadata.kind !== 'ready' || !metadata.rawText) return null;
    return parseGenParams(metadata.rawText);
  }, [metadata]);

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-white/40 p-6 text-center">
        Select an image to see its details.
      </div>
    );
  }

  const flashToast = (msg: string): void => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const sendToTxt2Img = (): void => {
    if (!parsed) return;
    const f = parsed.fields;
    if (f.prompt !== undefined) setField('prompt', f.prompt);
    if (f.negative_prompt !== undefined) setField('negative_prompt', f.negative_prompt);
    if (f.sampler_name !== undefined) setField('sampler_name', f.sampler_name);
    if (f.scheduler !== undefined) setField('scheduler', f.scheduler);
    if (f.steps !== undefined) setField('steps', f.steps);
    if (f.cfg_scale !== undefined) setField('cfg_scale', f.cfg_scale);
    if (f.width !== undefined) setField('width', f.width);
    if (f.height !== undefined) setField('height', f.height);
    if (f.seed !== undefined) setField('seed', f.seed);
    if (f.enable_hr !== undefined) setField('enable_hr', f.enable_hr);
    if (f.hr_scale !== undefined) setField('hr_scale', f.hr_scale);
    if (f.hr_upscaler !== undefined) setField('hr_upscaler', f.hr_upscaler);
    if (f.denoising_strength !== undefined) setField('denoising_strength', f.denoising_strength);
    flashToast('Parameters loaded into Txt2Img.');
    navigate('/generate/txt2img');
  };

  const openInFolder = async (): Promise<void> => {
    const ok = await window.forge.shell.showItemInFolder(entry.path);
    if (!ok) flashToast('Could not open folder.');
  };

  const sendToImg2Img = async (): Promise<void> => {
    try {
      const base64 = await fetchAsBase64(pathToForgeImg(entry.relPath));
      useImg2ImgStore.getState().setInitImage(entry.path, base64);
      if (parsed) useImg2ImgStore.getState().loadFromTxt2ImgFields(parsed.fields);
      navigate('/generate/img2img');
    } catch {
      flashToast('Could not load image.');
    }
  };

  const copyParameters = async (): Promise<void> => {
    if (metadata.kind !== 'ready' || !metadata.rawText) return;
    await navigator.clipboard.writeText(metadata.rawText);
    flashToast('Copied to clipboard.');
  };

  return (
    <div className="h-full flex flex-col min-h-0 border-l border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded border border-border bg-bg-panel/40 p-2 flex items-center justify-center">
          <img
            key={entry.path}
            src={pathToForgeImg(entry.relPath)}
            alt={basename(entry.relPath)}
            className="max-w-full max-h-[40vh] object-contain rounded"
          />
        </div>

        <div className="text-xs text-white/60 space-y-1 font-mono break-all">
          <div>{entry.relPath}</div>
          <div>
            {formatBytes(entry.sizeBytes)} · {formatDate(entry.mtimeMs)}
          </div>
        </div>

        <MetadataBlock parsed={parsed} metadata={metadata} />
      </div>

      <div className="border-t border-border p-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={sendToTxt2Img}
          disabled={!parsed}
          title={parsed ? '' : 'Not recognised as A1111 format'}
          className="px-3 py-1.5 rounded bg-accent text-accent-fg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send to txt2img
        </button>
        <button
          type="button"
          onClick={() => void sendToImg2Img()}
          className="px-3 py-1.5 rounded bg-accent text-accent-fg"
        >
          Send to img2img
        </button>
        <button
          type="button"
          onClick={() => void openInFolder()}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
        >
          Open in folder
        </button>
        <button
          type="button"
          onClick={() => void copyParameters()}
          disabled={metadata.kind !== 'ready' || !metadata.rawText}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copy parameters
        </button>
        {toast && (
          <span className="ml-auto text-xs text-white/60">{toast}</span>
        )}
      </div>
    </div>
  );
}

function MetadataBlock({
  metadata,
  parsed,
}: {
  metadata: ReturnType<typeof useImageMetadata>;
  parsed: ReturnType<typeof parseGenParams>;
}): ReactElement {
  if (metadata.kind === 'loading') {
    return <div className="text-sm text-white/50">Reading metadata…</div>;
  }
  if (metadata.kind === 'error') {
    return (
      <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
        {metadata.message}
      </div>
    );
  }
  if (metadata.kind === 'missing') {
    return <div className="text-sm text-white/50">{metadata.message}</div>;
  }

  return (
    <div className="space-y-3">
      {parsed && (
        <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
          {parsed.fields.prompt && (
            <Row label="Prompt" value={parsed.fields.prompt} mono />
          )}
          {parsed.fields.negative_prompt && (
            <Row label="Negative" value={parsed.fields.negative_prompt} mono />
          )}
          {parsed.fields.sampler_name && (
            <Row label="Sampler" value={parsed.fields.sampler_name} />
          )}
          {parsed.fields.scheduler && (
            <Row label="Scheduler" value={parsed.fields.scheduler} />
          )}
          {parsed.fields.steps != null && (
            <Row label="Steps" value={String(parsed.fields.steps)} />
          )}
          {parsed.fields.cfg_scale != null && (
            <Row label="CFG" value={String(parsed.fields.cfg_scale)} />
          )}
          {parsed.fields.width != null && parsed.fields.height != null && (
            <Row
              label="Size"
              value={`${parsed.fields.width} × ${parsed.fields.height}`}
            />
          )}
          {parsed.fields.seed != null && (
            <Row label="Seed" value={String(parsed.fields.seed)} />
          )}
          {parsed.fields.enable_hr && (
            <Row label="Hires" value="enabled" />
          )}
        </div>
      )}
      <details className="rounded border border-border bg-bg-panel/40">
        <summary className="px-3 py-2 cursor-pointer text-white/80 select-none text-xs">
          Raw parameters
        </summary>
        <pre className="px-3 py-2 text-[11px] text-white/70 whitespace-pre-wrap break-all border-t border-border max-h-64 overflow-auto">
          {metadata.rawText ?? ''}
        </pre>
      </details>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): ReactElement {
  return (
    <>
      <div className="text-white/40 self-start">{label}</div>
      <div
        className={[
          'text-white/90 break-words whitespace-pre-wrap',
          mono ? 'font-mono text-[11px]' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </>
  );
}

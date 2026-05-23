import { useState, type DragEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store.js';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';
import { usePngInfoApi } from '../../hooks/useSdApi.js';
import { parsePngTextChunks } from '../../lib/pngTextChunks.js';
import { parseGenParams, type ParsedGenParams } from '../../lib/parseGenParams.js';

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

function isPngName(name: string): boolean {
  return /\.png$/i.test(name);
}

function mimeFor(name: string): string {
  if (isPngName(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'image/jpeg';
}

export function PngInfoPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const navigate = useNavigate();
  const setField = useTxt2ImgStore((s) => s.setField);
  const pngInfoApi = usePngInfoApi();

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedGenParams | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string): void => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  };

  const handleFile = async (
    name: string,
    buffer: ArrayBuffer,
    dataUrl: string,
  ): Promise<void> => {
    setLoadError(null);
    setSourceName(name);
    setPreviewDataUrl(dataUrl);
    setRawText(null);
    setParsed(null);

    if (isPngName(name)) {
      const chunks = parsePngTextChunks(buffer);
      const text = (chunks.parameters ?? '').trim();
      if (text) {
        setRawText(text);
        setParsed(parseGenParams(text));
        return;
      }
    }

    if (status.kind !== 'ready') {
      setLoadError(
        isPngName(name)
          ? 'No metadata found in this PNG.'
          : 'Backend not ready — can’t parse JPEG/WEBP metadata.',
      );
      return;
    }
    try {
      const base64 = arrayBufferToBase64(buffer);
      const r = await pngInfoApi.mutateAsync({
        image: `data:${mimeFor(name)};base64,${base64}`,
      });
      const text = (r.info ?? '').trim();
      if (!text) {
        setLoadError('No generation metadata found.');
        return;
      }
      setRawText(text);
      setParsed(parseGenParams(text));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const buf = await readFileAsArrayBuffer(file);
    const dataUrl = await readFileAsDataUrl(file);
    await handleFile(file.name, buf, dataUrl);
  };

  const pickFromDialog = async (): Promise<void> => {
    const r = await window.forge.dialog.openImage();
    if (!r) return;
    const [, base64] = r.dataUrl.split('base64,');
    if (!base64) return;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    await handleFile(r.path, ab as ArrayBuffer, r.dataUrl);
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
    navigate('/generate/txt2img');
  };

  const copyParameters = async (): Promise<void> => {
    if (!rawText) return;
    await navigator.clipboard.writeText(rawText);
    flash('Copied');
  };

  return (
    <div className="h-full grid grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] min-h-0">
      <div className="flex flex-col min-h-0 border-r border-border overflow-y-auto p-4 gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => void onDrop(e)}
          className={[
            'rounded border-2 border-dashed p-4 transition-colors',
            dragOver ? 'border-accent bg-accent/10' : 'border-border bg-bg-panel/30',
          ].join(' ')}
        >
          {previewDataUrl ? (
            <div className="space-y-3">
              <img
                src={previewDataUrl}
                alt="source"
                className="max-h-96 mx-auto rounded border border-border"
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-white/60 truncate">{sourceName}</div>
                <button
                  type="button"
                  onClick={() => void pickFromDialog()}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-white/50">
              <div>Drop an image here, or</div>
              <button
                type="button"
                onClick={() => void pickFromDialog()}
                className="px-3 py-1.5 rounded bg-accent text-accent-fg text-xs"
              >
                Choose image…
              </button>
            </div>
          )}
        </div>
        {loadError && (
          <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
            {loadError}
          </div>
        )}
      </div>

      <div className="flex flex-col min-h-0 overflow-y-auto p-4 gap-3">
        {parsed ? (
          <>
            <div className="flex gap-2 items-center">
              <button
                onClick={sendToTxt2Img}
                className="px-3 py-1.5 rounded bg-accent text-accent-fg text-sm"
              >
                Send to txt2img
              </button>
              <button
                onClick={() => void copyParameters()}
                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Copy parameters
              </button>
              {toast && <span className="text-xs text-white/60">{toast}</span>}
            </div>

            {parsed.fields.prompt && (
              <section className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  Prompt
                </div>
                <pre className="text-sm whitespace-pre-wrap break-words rounded bg-bg-panel/40 border border-border p-2">
                  {parsed.fields.prompt}
                </pre>
              </section>
            )}
            {parsed.fields.negative_prompt && (
              <section className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  Negative prompt
                </div>
                <pre className="text-sm whitespace-pre-wrap break-words rounded bg-bg-panel/40 border border-border p-2">
                  {parsed.fields.negative_prompt}
                </pre>
              </section>
            )}

            <section className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Parameters
              </div>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
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
                {Object.entries(parsed.unrecognised).map(([k, v]) => (
                  <Row key={k} label={k} value={v} />
                ))}
              </dl>
            </section>

            <details className="rounded border border-border bg-bg-panel/40">
              <summary className="px-3 py-2 cursor-pointer text-white/80 select-none text-xs">
                Raw parameters
              </summary>
              <pre className="px-3 py-2 text-[11px] text-white/70 whitespace-pre-wrap break-all border-t border-border max-h-64 overflow-auto">
                {rawText ?? ''}
              </pre>
            </details>
          </>
        ) : (
          <div className="text-sm text-white/40 text-center mt-12">
            Drop or open an image to view its embedded generation parameters.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <>
      <dt className="text-white/50">{label}</dt>
      <dd className="text-white/80 font-mono break-all">{value}</dd>
    </>
  );
}

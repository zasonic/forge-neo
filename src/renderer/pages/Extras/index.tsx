import { useState, type DragEvent, type ReactElement } from 'react';
import {
  useExtrasSingle,
  useUpscalers,
} from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf('base64,');
  return idx === -1 ? dataUrl : dataUrl.slice(idx + 'base64,'.length);
}

export function ExtrasPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  const upscalers = useUpscalers();
  const run = useExtrasSingle();

  const [imageB64, setImageB64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [resize, setResize] = useState(2);
  const [upscaler1, setUpscaler1] = useState('None');
  const [upscaler2, setUpscaler2] = useState('None');
  const [u2Visibility, setU2Visibility] = useState(0);
  const [gfpgan, setGfpgan] = useState(0);
  const [codeformer, setCodeformer] = useState(0);
  const [codeformerWeight, setCodeformerWeight] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to upscale images.
      </div>
    );
  }

  const onDrop = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setImageName(file.name);
    setImageB64(stripDataUrlPrefix(await readFileAsDataUrl(file)));
  };

  const pickFromDialog = async (): Promise<void> => {
    const r = await window.forge.dialog.openImage();
    if (!r) return;
    setImageName(r.path);
    setImageB64(stripDataUrlPrefix(r.dataUrl));
  };

  const submit = (): void => {
    if (!imageB64) return;
    run.mutate({
      image: imageB64,
      resize_mode: 0,
      show_extras_results: true,
      gfpgan_visibility: gfpgan,
      codeformer_visibility: codeformer,
      codeformer_weight: codeformerWeight,
      upscaling_resize: resize,
      upscaling_resize_w: 512,
      upscaling_resize_h: 512,
      upscaling_crop: true,
      upscaler_1: upscaler1,
      upscaler_2: upscaler2,
      extras_upscaler_2_visibility: u2Visibility,
      upscale_first: false,
    });
  };

  const upscalerNames = upscalers.data?.map((u) => u.name) ?? ['None'];
  const result = run.data;

  return (
    <div className="h-full grid grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] min-h-0">
      <div className="flex flex-col min-h-0 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => void onDrop(e)}
            className={[
              'rounded border-2 border-dashed p-3 transition-colors',
              dragOver ? 'border-accent bg-accent/10' : 'border-border bg-bg-panel/30',
            ].join(' ')}
          >
            {imageB64 ? (
              <div className="flex gap-3">
                <img
                  src={`data:image/png;base64,${imageB64}`}
                  alt="source"
                  className="w-32 h-32 object-cover rounded border border-border"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="text-xs text-white/70 truncate" title={imageName ?? ''}>
                    {imageName ?? '(uploaded)'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void pickFromDialog()}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageB64(null);
                        setImageName(null);
                      }}
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-sm text-white/50">
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
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">Resize</span>
              <input
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={resize}
                onChange={(e) => setResize(Number(e.target.value))}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">Upscaler 1</span>
              <select
                value={upscaler1}
                onChange={(e) => setUpscaler1(e.target.value)}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              >
                {upscalerNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">Upscaler 2</span>
              <select
                value={upscaler2}
                onChange={(e) => setUpscaler2(e.target.value)}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              >
                {upscalerNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">Upscaler 2 visibility</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={u2Visibility}
                onChange={(e) => setU2Visibility(Number(e.target.value))}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">GFPGAN</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={gfpgan}
                onChange={(e) => setGfpgan(Number(e.target.value))}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/60">CodeFormer</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={codeformer}
                onChange={(e) => setCodeformer(Number(e.target.value))}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-white/60">CodeFormer weight</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={codeformerWeight}
                onChange={(e) => setCodeformerWeight(Number(e.target.value))}
                className="px-2 py-1.5 rounded bg-bg-panel border border-border"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!imageB64 || run.isPending}
              className="px-4 py-2 rounded bg-accent text-accent-fg disabled:opacity-50"
            >
              {run.isPending ? 'Upscaling…' : 'Upscale'}
            </button>
            {run.isPending && (
              <button
                type="button"
                onClick={run.abort}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
            )}
          </div>

          {run.isError && (
            <div className="text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
              {run.error.message}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col min-h-0 overflow-y-auto p-4 gap-3">
        {result ? (
          <>
            <img
              src={`data:image/png;base64,${result.image}`}
              alt="result"
              className="w-full rounded border border-border bg-bg-panel/40"
            />
            {result.html_info && (
              <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono break-words">
                {result.html_info.replace(/<[^>]+>/g, '')}
              </pre>
            )}
          </>
        ) : (
          <div className="text-sm text-white/40 text-center mt-12">
            Upscaled result will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, type DragEvent, type ReactElement } from 'react';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';

// TODO(M4.5): add inpaint mask drawing controls (canvas overlay + brush).

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

export function InitImagePanel(): ReactElement {
  const initImagePath = useImg2ImgStore((s) => s.initImagePath);
  const initImages = useImg2ImgStore((s) => s.form.init_images);
  const setInitImage = useImg2ImgStore((s) => s.setInitImage);
  const clearInitImage = useImg2ImgStore((s) => s.clearInitImage);
  const [dragOver, setDragOver] = useState(false);

  const pickFromDialog = async (): Promise<void> => {
    const r = await window.forge.dialog.openImage();
    if (!r) return;
    setInitImage(r.path, stripDataUrlPrefix(r.dataUrl));
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setInitImage(file.name, stripDataUrlPrefix(dataUrl));
  };

  const preview = initImages[0];

  return (
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
        {preview ? (
          <div className="flex gap-3">
            <img
              src={`data:image/png;base64,${preview}`}
              alt="init"
              className="w-32 h-32 object-cover rounded border border-border"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="text-xs text-white/70 truncate" title={initImagePath ?? ''}>
                {initImagePath ?? '(uploaded)'}
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
                  onClick={clearInitImage}
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
  );
}

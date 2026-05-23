import { useState, type ReactElement } from 'react';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';

export function ResultGrid(): ReactElement {
  const lastResult = useTxt2ImgStore((s) => s.lastResult);
  const [zoom, setZoom] = useState<string | null>(null);

  if (!lastResult || lastResult.images.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 text-sm">
        No results yet. Generate something.
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {lastResult.images.map((img, i) => (
          <button
            key={i}
            onClick={() => setZoom(img)}
            className="block aspect-square overflow-hidden rounded border border-border bg-bg-panel"
          >
            <img
              src={`data:image/png;base64,${img}`}
              alt={`result ${i}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <button
          disabled
          title="Coming in M4"
          className="px-3 py-1.5 rounded bg-white/5 text-white/40 cursor-not-allowed"
        >
          Send to img2img
        </button>
      </div>
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 cursor-zoom-out"
        >
          <img
            src={`data:image/png;base64,${zoom}`}
            alt="zoom"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

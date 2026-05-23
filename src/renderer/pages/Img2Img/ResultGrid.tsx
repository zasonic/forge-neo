import { useState, type ReactElement } from 'react';
import { useImg2ImgStore } from '../../lib/img2imgStore.js';

export function ResultGrid(): ReactElement {
  const lastResult = useImg2ImgStore((s) => s.lastResult);
  const setInitImage = useImg2ImgStore((s) => s.setInitImage);
  const [zoom, setZoom] = useState<string | null>(null);

  if (!lastResult || lastResult.images.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 text-sm">
        No results yet. Generate something.
      </div>
    );
  }

  const promoteAsInit = (img: string): void => {
    setInitImage('(generated)', img);
  };

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {lastResult.images.map((img, i) => (
          <div key={i} className="relative group">
            <button
              onClick={() => setZoom(img)}
              className="block aspect-square overflow-hidden rounded border border-border bg-bg-panel w-full"
            >
              <img
                src={`data:image/png;base64,${img}`}
                alt={`result ${i}`}
                className="w-full h-full object-cover"
              />
            </button>
            <button
              onClick={() => promoteAsInit(img)}
              className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/70 hover:bg-black text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Use this result as the new init image"
            >
              Use as init
            </button>
          </div>
        ))}
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

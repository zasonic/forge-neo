import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { OutputEntry } from '@shared/ipc/contract.js';
import { apiFetch } from '../../lib/apiClient.js';
import { useApiContext } from '../../hooks/useApiContext.js';
import { parsePngTextChunks } from '../../lib/pngTextChunks.js';
import { pathToForgeImg } from './pathToForgeImg.js';

export type MetadataState =
  | { kind: 'loading' }
  | { kind: 'ready'; rawText: string | null }
  | { kind: 'missing'; message: string; triedBackend: boolean }
  | { kind: 'error'; message: string };

const PngInfoResponse = z.object({
  info: z.string().optional(),
  parameters: z.unknown().optional(),
  items: z.unknown().optional(),
});

const cache = new Map<string, MetadataState>();

function isPng(name: string): boolean {
  return /\.png$/i.test(name);
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

export function useImageMetadata(entry: OutputEntry | null): MetadataState {
  const ctx = useApiContext();
  const [version, setVersion] = useState(0);
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    const cached = cache.get(entry.path);
    // Re-attempt if the previous miss happened without a backend connection
    // and the backend is now available.
    if (cached && !(cached.kind === 'missing' && ctx && !cached.triedBackend)) {
      return;
    }
    if (inflightRef.current === entry.path) return;
    inflightRef.current = entry.path;

    let alive = true;
    const settle = (next: MetadataState): void => {
      cache.set(entry.path, next);
      if (inflightRef.current === entry.path) inflightRef.current = null;
      if (alive) setVersion((v) => v + 1);
    };

    fetch(pathToForgeImg(entry.relPath))
      .then(async (res) => {
        if (!res.ok) {
          settle({ kind: 'error', message: 'File no longer exists.' });
          return;
        }
        const buf = await res.arrayBuffer();

        if (isPng(entry.relPath)) {
          const chunks = parsePngTextChunks(buf);
          if (chunks.parameters) {
            settle({ kind: 'ready', rawText: chunks.parameters });
            return;
          }
        }

        if (ctx) {
          const base64 = arrayBufferToBase64(buf);
          const mime = isPng(entry.relPath)
            ? 'image/png'
            : /\.webp$/i.test(entry.relPath)
            ? 'image/webp'
            : 'image/jpeg';
          const png = await apiFetch(ctx, '/sdapi/v1/png-info', PngInfoResponse, {
            method: 'POST',
            body: JSON.stringify({ image: `data:${mime};base64,${base64}` }),
          });
          const text = (png.info ?? '').trim();
          settle(
            text.length
              ? { kind: 'ready', rawText: text }
              : {
                  kind: 'missing',
                  message: 'No generation metadata found.',
                  triedBackend: true,
                },
          );
          return;
        }

        settle({
          kind: 'missing',
          message: 'No generation metadata found.',
          triedBackend: false,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        settle({ kind: 'error', message });
      });

    return () => {
      alive = false;
    };
  }, [entry, ctx]);

  // Render-time derivation: return whatever is in the cache for this entry,
  // or 'loading' while a fetch is in flight or pending. version is read so
  // that a cache write triggers a re-render.
  void version;
  if (!entry) return { kind: 'loading' };
  return cache.get(entry.path) ?? { kind: 'loading' };
}

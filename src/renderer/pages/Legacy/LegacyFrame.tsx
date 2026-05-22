import { useEffect, useRef, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../lib/store.js';
import { SUBPATH } from '@shared/constants.js';

const VALID_TABS = new Set(['txt2img', 'img2img', 'extras', 'pnginfo', 'modelmerger', 'extensions', 'settings']);

interface WillNavigateEvent extends Event {
  url: string;
}

export function LegacyFrame(): ReactElement {
  const { tab = 'txt2img' } = useParams<{ tab: string }>();
  const safeTab = VALID_TABS.has(tab) ? tab : 'txt2img';
  const status = useAppStore((s) => s.status);
  const ref = useRef<HTMLElement | null>(null);

  const baseUrl = status.kind === 'ready' ? status.baseUrl : null;
  const src = baseUrl ? `${baseUrl}/${SUBPATH}/#${safeTab}` : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || !baseUrl) return;
    const allowedPrefix = `${baseUrl}/${SUBPATH}`;
    const guard = (e: Event): void => {
      const ne = e as WillNavigateEvent;
      if (!ne.url.startsWith(allowedPrefix)) {
        e.preventDefault();
      }
    };
    el.addEventListener('will-navigate', guard);
    return () => el.removeEventListener('will-navigate', guard);
  }, [baseUrl]);

  if (!src) {
    return (
      <div className="h-full flex items-center justify-center text-white/60 text-sm">
        Backend not ready. Start it from the status bar below.
      </div>
    );
  }

  return (
    <webview
      ref={ref}
      src={src}
      partition="persist:legacy"
      className="w-full h-full bg-white"
    />
  );
}

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { LogLine } from '@shared/ipc/contract.js';

const MAX_LINES = 500;

export function LogPane(): ReactElement {
  const [lines, setLines] = useState<LogLine[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followRef = useRef(true);

  useEffect(() => {
    const off = window.forge.setup.onLog((line) => {
      setLines((prev) => {
        const next = prev.length >= MAX_LINES ? prev.slice(prev.length - MAX_LINES + 1) : prev;
        return [...next, line];
      });
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (followRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const onScroll = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    followRef.current = atBottom;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="h-full overflow-y-auto bg-bg-subtle rounded border border-border font-mono text-[11px] leading-snug"
    >
      <div className="p-2 whitespace-pre-wrap break-all">
        {lines.length === 0 ? (
          <div className="text-white/30">no output yet</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={lineClass(line.stream)}>
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function lineClass(stream: LogLine['stream']): string {
  switch (stream) {
    case 'stdout': return 'text-white/80';
    case 'stderr': return 'text-amber-200/90';
    case 'app':    return 'text-emerald-200/90';
  }
}

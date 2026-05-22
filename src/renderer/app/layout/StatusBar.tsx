import type { ReactElement } from 'react';
import { useAppStore } from '../../lib/store.js';

function pillClass(color: 'gray' | 'amber' | 'green' | 'red'): string {
  const palette = {
    gray: 'bg-white/10 text-white/60',
    amber: 'bg-amber-500/20 text-amber-300',
    green: 'bg-emerald-500/20 text-emerald-300',
    red: 'bg-red-500/20 text-red-300',
  };
  return `inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${palette[color]}`;
}

function dot(color: string): ReactElement {
  return <span className={`w-1.5 h-1.5 rounded-full ${color}`} aria-hidden />;
}

export function StatusBar(): ReactElement {
  const status = useAppStore((s) => s.status);

  let pill: ReactElement;
  switch (status.kind) {
    case 'idle':
      pill = <span className={pillClass('gray')}>{dot('bg-white/40')} backend idle</span>;
      break;
    case 'starting':
      pill = <span className={pillClass('amber')}>{dot('bg-amber-400')} backend starting{status.pid ? ` (pid ${status.pid})` : ''}</span>;
      break;
    case 'ready':
      pill = <span className={pillClass('green')}>{dot('bg-emerald-400')} backend ready · {status.baseUrl}</span>;
      break;
    case 'stopping':
      pill = <span className={pillClass('amber')}>{dot('bg-amber-400')} backend stopping</span>;
      break;
    case 'crashed':
      pill = <span className={pillClass('red')}>{dot('bg-red-400')} backend crashed (code {status.code ?? 'null'})</span>;
      break;
  }

  const canStart = status.kind === 'idle' || status.kind === 'crashed';
  const canRestart = status.kind === 'ready' || status.kind === 'crashed';

  return (
    <footer className="h-9 shrink-0 border-t border-border bg-bg-subtle px-3 flex items-center gap-3 text-xs">
      {pill}
      <div className="ml-auto flex items-center gap-2">
        {canStart && (
          <button
            onClick={() => void window.forge.backend.start()}
            className="px-2 py-1 rounded bg-accent text-accent-fg hover:opacity-90"
          >
            Start backend
          </button>
        )}
        {canRestart && (
          <button
            onClick={() => void window.forge.backend.restart()}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Restart
          </button>
        )}
        {status.kind === 'ready' && (
          <button
            onClick={() => void window.forge.backend.stop()}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Stop
          </button>
        )}
      </div>
    </footer>
  );
}

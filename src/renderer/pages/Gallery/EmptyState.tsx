import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';

export type EmptyVariant = 'loading' | 'not-installed' | 'no-images' | 'error';

interface Props {
  variant: EmptyVariant;
  message?: string;
  onRetry?: () => void;
}

export function EmptyState({ variant, message, onRetry }: Props): ReactElement {
  let title = '';
  let body: ReactElement | string = '';
  let action: ReactElement | null = null;

  switch (variant) {
    case 'loading':
      title = 'Loading…';
      body = 'Scanning outputs folder.';
      break;
    case 'not-installed':
      title = 'Not installed yet';
      body = 'Finish the first-run setup to start generating images.';
      action = (
        <Link
          to="/setup/welcome"
          className="px-3 py-1.5 rounded bg-accent text-accent-fg text-sm"
        >
          Open setup
        </Link>
      );
      break;
    case 'no-images':
      title = 'No images yet';
      body = (
        <span>
          Generate something in{' '}
          <Link to="/generate/txt2img" className="text-accent underline">
            Txt2Img
          </Link>{' '}
          and they will appear here.
        </span>
      );
      break;
    case 'error':
      title = 'Could not scan outputs';
      body = message ?? 'Unknown error.';
      action = onRetry ? (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Retry
        </button>
      ) : null;
      break;
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-3">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-white/60">{body}</div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

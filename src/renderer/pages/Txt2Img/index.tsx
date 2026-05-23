import type { ReactElement } from 'react';
import { PromptPanel } from './PromptPanel.js';
import { ParamsPanel } from './ParamsPanel.js';
import { ProgressPanel } from './ProgressPanel.js';
import { ResultGrid } from './ResultGrid.js';
import { useAppStore } from '../../lib/store.js';

export function Txt2ImgPage(): ReactElement {
  const status = useAppStore((s) => s.status);
  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to use Txt2Img.
      </div>
    );
  }
  return (
    <div className="h-full grid grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] min-h-0">
      <div className="flex flex-col min-h-0 border-r border-border">
        <PromptPanel />
        <div className="overflow-y-auto flex-1 border-t border-border">
          <ParamsPanel />
        </div>
      </div>
      <div className="flex flex-col min-h-0">
        <ProgressPanel />
        <div className="overflow-y-auto flex-1">
          <ResultGrid />
        </div>
      </div>
    </div>
  );
}

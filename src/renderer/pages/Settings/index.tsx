import { useState, type ReactElement, type ReactNode } from 'react';
import { AppSettings } from './App.js';
import { BackendSettings } from './Backend.js';

type Tab = 'app' | 'backend';

export function SettingsPage(): ReactElement {
  const [tab, setTab] = useState<Tab>('app');

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h1 className="text-lg font-semibold mr-4">Settings</h1>
        <TabButton active={tab === 'app'} onClick={() => setTab('app')}>
          App
        </TabButton>
        <TabButton active={tab === 'backend'} onClick={() => setTab('backend')}>
          Backend (Forge)
        </TabButton>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'app' ? <AppSettings /> : <BackendSettings />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded text-sm transition-colors',
        active
          ? 'bg-accent text-accent-fg'
          : 'bg-bg-panel hover:bg-white/10 text-white/80',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

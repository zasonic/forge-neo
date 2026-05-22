import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';

interface Item {
  to: string;
  label: string;
  hint?: string;
}

const primary: Item[] = [
  { to: '/generate/txt2img', label: 'Generate' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/models', label: 'Models' },
  { to: '/loras', label: 'LoRAs' },
  { to: '/settings', label: 'Settings' },
];

const legacy: Item[] = [
  { to: '/legacy/extras', label: 'Extras' },
  { to: '/legacy/pnginfo', label: 'PNG Info' },
  { to: '/legacy/modelmerger', label: 'Model Merger' },
  { to: '/legacy/extensions', label: 'Extensions' },
  { to: '/legacy/settings', label: 'Backend Settings' },
];

function linkClass({ isActive }: { isActive: boolean }): string {
  return [
    'block px-3 py-2 rounded-md text-sm transition-colors',
    isActive ? 'bg-bg-panel text-white' : 'text-white/70 hover:text-white hover:bg-bg-subtle',
  ].join(' ');
}

export function Sidebar(): ReactElement {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-subtle flex flex-col">
      <div className="p-4">
        <div className="text-lg font-semibold">Forge Neo</div>
        <div className="text-xs text-white/40">v0.1.0</div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {primary.map((i) => (
          <NavLink key={i.to} to={i.to} className={linkClass}>
            {i.label}
          </NavLink>
        ))}
        <div className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-wider text-white/40">
          Legacy UI
        </div>
        {legacy.map((i) => (
          <NavLink key={i.to} to={i.to} className={linkClass}>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

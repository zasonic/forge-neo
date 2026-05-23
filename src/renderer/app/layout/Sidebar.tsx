import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';

interface Item {
  to: string;
  label: string;
  hint?: string;
}

const generate: Item[] = [
  { to: '/generate/txt2img', label: 'txt2img' },
  { to: '/extras', label: 'Extras' },
  { to: '/png-info', label: 'PNG Info' },
];

const library: Item[] = [
  { to: '/gallery', label: 'Gallery' },
  { to: '/models', label: 'Models' },
];

const advanced: Item[] = [
  { to: '/model-merger', label: 'Model Merger' },
  { to: '/extensions', label: 'Extensions' },
  { to: '/settings', label: 'Settings' },
];

function linkClass({ isActive }: { isActive: boolean }): string {
  return [
    'block px-3 py-2 rounded-md text-sm transition-colors',
    isActive ? 'bg-bg-panel text-white' : 'text-white/70 hover:text-white hover:bg-bg-subtle',
  ].join(' ');
}

function Group({ title, items }: { title: string; items: Item[] }): ReactElement {
  return (
    <>
      <div className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-wider text-white/40">
        {title}
      </div>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} className={linkClass}>
          {i.label}
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar(): ReactElement {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-subtle flex flex-col">
      <div className="p-4">
        <div className="text-lg font-semibold">Forge Neo</div>
        <div className="text-xs text-white/40">v0.1.0</div>
      </div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto pb-3">
        <Group title="Generate" items={generate} />
        <Group title="Library" items={library} />
        <Group title="Advanced" items={advanced} />
      </nav>
    </aside>
  );
}

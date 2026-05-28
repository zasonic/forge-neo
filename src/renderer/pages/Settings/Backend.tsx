import { useMemo, useState, type ReactElement } from 'react';
import type { OptionMetadata } from '@shared/api/schemas.js';
import {
  useOptions,
  useOptionsSchema,
  useSetOptions,
} from '../../hooks/useSdApi.js';
import { useAppStore } from '../../lib/store.js';

type Draft = Record<string, unknown>;

function sectionKey(o: OptionMetadata): string {
  const parts = o.section.filter((s): s is string => typeof s === 'string');
  return parts.length > 0 ? parts.join(' · ') : 'general';
}

export function BackendSettings(): ReactElement {
  const status = useAppStore((s) => s.status);
  const schema = useOptionsSchema();
  const options = useOptions();
  const save = useSetOptions();

  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState<Draft>({});

  const dirty = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const apply = (): void => {
    if (!dirty) return;
    save.mutate(draft, {
      onSuccess: () => setDraft({}),
    });
  };

  if (status.kind !== 'ready') {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm p-6 text-center">
        Backend is {status.kind}. Start it from the status bar to edit backend
        settings.
      </div>
    );
  }

  if (schema.isLoading || options.isLoading) {
    return (
      <div className="p-6 text-sm text-white/40">Loading backend options…</div>
    );
  }

  if (schema.isError) {
    return (
      <div className="p-6 text-sm text-red-300">
        Could not load options schema: {schema.error.message}
        <div className="text-xs text-white/40 mt-2">
          This route is provided by the bundled <code>forge-neo-api</code>{' '}
          extension. Make sure it is installed and enabled.
        </div>
      </div>
    );
  }

  const grouped = new Map<string, OptionMetadata[]>();
  for (const o of schema.data ?? []) {
    const k = sectionKey(o);
    const arr = grouped.get(k) ?? [];
    arr.push(o);
    grouped.set(k, arr);
  }
  const sections = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  const visible = (o: OptionMetadata): boolean => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      o.key.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)
    );
  };

  const current = (o: OptionMetadata): unknown => {
    if (o.key in draft) return draft[o.key];
    const live = options.data?.[o.key as keyof typeof options.data];
    if (live !== undefined) return live;
    return o.default;
  };

  const update = (key: string, value: unknown): void => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const reset = (key: string): void => {
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-bg-subtle flex items-center gap-3 sticky top-0 z-10">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter options…"
          className="flex-1 max-w-sm px-3 py-1.5 rounded bg-bg-panel border border-border text-sm"
        />
        <span className="text-xs text-white/40">
          {dirty ? `${Object.keys(draft).length} pending` : 'No changes'}
        </span>
        <button
          onClick={() => setDraft({})}
          disabled={!dirty || save.isPending}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
        >
          Discard
        </button>
        <button
          onClick={apply}
          disabled={!dirty || save.isPending}
          className="px-3 py-1.5 rounded bg-accent text-accent-fg text-sm disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Apply'}
        </button>
      </div>

      {save.isError && (
        <div className="mx-6 mt-3 text-sm text-red-300 rounded bg-red-500/10 border border-red-500/30 p-3">
          Apply failed: {save.error.message}
        </div>
      )}

      <div className="p-6 space-y-8 max-w-4xl">
        {sections.map(([section, opts]) => {
          const filtered = opts.filter(visible);
          if (filtered.length === 0) return null;
          return (
            <section key={section} className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider text-white/40 border-b border-border pb-1">
                {section}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {filtered.map((o) => {
                  const value = current(o);
                  const isDirty = o.key in draft;
                  return (
                    <OptionField
                      key={o.key}
                      option={o}
                      value={value}
                      isDirty={isDirty}
                      onChange={(v) => update(o.key, v)}
                      onReset={() => reset(o.key)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OptionField({
  option,
  value,
  isDirty,
  onChange,
  onReset,
}: {
  option: OptionMetadata;
  value: unknown;
  isDirty: boolean;
  onChange: (v: unknown) => void;
  onReset: () => void;
}): ReactElement {
  const args = option.component_args ?? {};
  const choices = Array.isArray(args.choices) ? (args.choices as unknown[]) : null;

  const labelEl = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/80">{option.label}</span>
      {isDirty && (
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] uppercase tracking-wider text-amber-300 hover:text-amber-200"
          title="Revert this change"
        >
          modified
        </button>
      )}
    </div>
  );

  const description = (
    <div className="text-[11px] text-white/40 font-mono break-words">
      {option.key}
      {option.comment ? ` · ${option.comment.replace(/<[^>]+>/g, '').trim()}` : ''}
    </div>
  );

  if (option.component === 'Checkbox' || typeof value === 'boolean') {
    return (
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1"
        />
        <span className="flex-1 min-w-0">
          {labelEl}
          {description}
        </span>
      </label>
    );
  }

  if (choices && choices.length > 0) {
    return (
      <label className="flex flex-col gap-1">
        {labelEl}
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm"
        >
          {choices.map((c) => (
            <option key={String(c)} value={String(c)}>
              {String(c)}
            </option>
          ))}
        </select>
        {description}
      </label>
    );
  }

  if (option.component === 'Slider' || typeof value === 'number') {
    const min = typeof args.minimum === 'number' ? args.minimum : undefined;
    const max = typeof args.maximum === 'number' ? args.maximum : undefined;
    const step = typeof args.step === 'number' ? args.step : undefined;
    return (
      <label className="flex flex-col gap-1">
        {labelEl}
        <input
          type="number"
          value={typeof value === 'number' ? value : Number(value ?? 0)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm"
        />
        {description}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      {labelEl}
      <input
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded bg-bg-panel border border-border text-sm font-mono"
      />
      {description}
    </label>
  );
}

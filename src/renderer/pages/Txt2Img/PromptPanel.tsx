import type { ReactElement } from 'react';
import { useTxt2ImgStore } from '../../lib/txt2imgStore.js';
import { useInterrupt, useTxt2Img } from '../../hooks/useSdApi.js';

export function PromptPanel(): ReactElement {
  const form = useTxt2ImgStore((s) => s.form);
  const setField = useTxt2ImgStore((s) => s.setField);
  const setResult = useTxt2ImgStore((s) => s.setResult);
  const t2i = useTxt2Img();
  const interrupt = useInterrupt();

  const generate = (): void => {
    t2i.mutate(form, {
      onSuccess: (data) => setResult(data),
    });
  };

  const cancel = (): void => {
    interrupt.mutate();
    t2i.abort();
  };

  const pending = t2i.isPending;

  return (
    <div className="p-4 space-y-3">
      <textarea
        value={form.prompt}
        onChange={(e) => setField('prompt', e.target.value)}
        placeholder="Prompt"
        rows={4}
        className="w-full px-3 py-2 rounded bg-bg-panel border border-border text-sm font-mono resize-y"
      />
      <textarea
        value={form.negative_prompt}
        onChange={(e) => setField('negative_prompt', e.target.value)}
        placeholder="Negative prompt"
        rows={2}
        className="w-full px-3 py-2 rounded bg-bg-panel border border-border text-sm font-mono resize-y"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={generate}
          disabled={pending || form.prompt.trim().length === 0}
          className="px-4 py-2 rounded bg-accent text-accent-fg disabled:opacity-50 text-sm"
        >
          {pending ? 'Generating…' : 'Generate'}
        </button>
        {pending && (
          <button
            onClick={cancel}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Interrupt
          </button>
        )}
        {t2i.isError && (
          <div
            className="text-xs text-red-300 flex-1 truncate"
            title={t2i.error.message}
          >
            {t2i.error.message}
          </div>
        )}
      </div>
    </div>
  );
}

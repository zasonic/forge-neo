import { useState, type ReactElement } from 'react';
import type { PngInfoResult } from '@shared/api/schemas.js';
import { fileUrl } from '../../lib/fileUrl.js';
import { basename } from '../../lib/pathlike.js';
import type { OutputEntry } from './index.js';

interface Props {
  entry: OutputEntry | null;
  info: PngInfoResult | null | undefined;
  onSendToTxt2Img: (info: PngInfoResult) => void;
  onSendToImg2Img: (entry: OutputEntry, info: PngInfoResult | null) => void;
}

function CopyButton({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore — fallback omitted in M4
    }
  };
  return (
    <button
      onClick={() => void copy()}
      disabled={disabled}
      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs disabled:opacity-40"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function DetailPanel({
  entry,
  info,
  onSendToTxt2Img,
  onSendToImg2Img,
}: Props): ReactElement {
  if (!entry) {
    return (
      <div className="p-6 text-center text-white/40 text-sm">
        Select an image to see details.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <img
        src={fileUrl(entry.path)}
        alt={basename(entry.path)}
        className="w-full rounded border border-border bg-bg-panel"
      />
      <div className="text-xs text-white/40 truncate font-mono" title={entry.path}>
        {basename(entry.path)}
      </div>

      {info === undefined && (
        <div className="text-sm text-white/40">Reading PNG info…</div>
      )}

      {info === null && (
        <div className="space-y-3">
          <div className="text-sm text-white/40">No parameters found in this PNG.</div>
          <button
            onClick={() => void window.forge.fs.showItemInFolder(entry.path)}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
          >
            Open in folder
          </button>
        </div>
      )}

      {info && (
        <>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/40">Prompt</div>
            <div className="text-sm font-mono whitespace-pre-wrap break-words p-2 rounded bg-bg-panel border border-border">
              {info.prompt || '(empty)'}
            </div>
          </div>
          {info.negativePrompt && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Negative
              </div>
              <div className="text-sm font-mono whitespace-pre-wrap break-words p-2 rounded bg-bg-panel border border-border">
                {info.negativePrompt}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Parameters
            </div>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(info.parameters).map(([k, v]) => (
                  <tr key={k} className="border-b border-border/40 last:border-0">
                    <td className="py-1 pr-3 text-white/50 align-top whitespace-nowrap">
                      {k}
                    </td>
                    <td className="py-1 break-all font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <CopyButton label="Copy prompt" value={info.prompt} />
            <CopyButton
              label="Copy seed"
              value={info.parameters.Seed ?? ''}
              disabled={!info.parameters.Seed}
            />
            <CopyButton label="Copy parameters" value={info.raw} />
            <button
              onClick={() => onSendToTxt2Img(info)}
              className="px-3 py-1.5 rounded bg-accent text-accent-fg text-xs"
            >
              Send to txt2img
            </button>
            <button
              onClick={() => onSendToImg2Img(entry, info)}
              className="px-3 py-1.5 rounded bg-accent text-accent-fg text-xs"
            >
              Send to img2img
            </button>
            <button
              onClick={() => void window.forge.fs.showItemInFolder(entry.path)}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
            >
              Open in folder
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import type { Txt2ImgPayload } from '@shared/api/schemas.js';

export interface ParsedGenParams {
  fields: Partial<Txt2ImgPayload>;
  rawText: string;
  unrecognised: Record<string, string>;
}

const KEY_LINE_REGEX = /^\s*([A-Z][\w .()/-]*)\s*:\s/;

function isSettingsLine(line: string): boolean {
  if (!KEY_LINE_REGEX.test(line)) return false;
  return /,\s*[A-Z][\w .()/-]*\s*:/.test(line);
}

function splitTopLevelCommas(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (ch === '"' && input[i - 1] !== '\\') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseKeyValuePairs(line: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of splitTopLevelCommas(line)) {
    const idx = part.indexOf(':');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    let value = part.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function coerceInt(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function coerceFloat(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseSize(v: string | undefined): { width: number; height: number } | null {
  if (!v) return null;
  const m = v.match(/^(\d+)\s*x\s*(\d+)$/i);
  if (!m) return null;
  const w = Number.parseInt(m[1]!, 10);
  const h = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { width: w, height: h };
}

export function parseGenParams(input: string | null | undefined): ParsedGenParams | null {
  if (!input || typeof input !== 'string') return null;
  const text = input.replace(/\r\n/g, '\n').trim();
  if (text.length === 0) return null;

  const lines = text.split('\n');

  // Locate the settings line: the last line that looks like a comma-joined key:value list.
  let settingsIdx = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (isSettingsLine(lines[i]!)) {
      settingsIdx = i;
      break;
    }
  }
  if (settingsIdx < 0) return null;

  const settingsLine = lines.slice(settingsIdx).join(' ');
  const before = lines.slice(0, settingsIdx);

  // Locate the negative-prompt block: lines starting with "Negative prompt:" through the line before settings.
  let negIdx = -1;
  for (let i = 0; i < before.length; i += 1) {
    if (/^\s*Negative prompt\s*:/i.test(before[i]!)) {
      negIdx = i;
      break;
    }
  }

  const prompt =
    (negIdx < 0 ? before : before.slice(0, negIdx)).join('\n').trim();
  const negative =
    negIdx < 0
      ? ''
      : before
          .slice(negIdx)
          .join('\n')
          .replace(/^\s*Negative prompt\s*:\s*/i, '')
          .trim();

  const kv = parseKeyValuePairs(settingsLine);

  const fields: Partial<Txt2ImgPayload> = {};
  if (prompt.length > 0) fields.prompt = prompt;
  if (negative.length > 0) fields.negative_prompt = negative;

  const steps = coerceInt(kv.get('Steps'));
  if (steps != null) fields.steps = steps;

  const sampler = kv.get('Sampler');
  if (sampler) fields.sampler_name = sampler;

  const scheduler = kv.get('Schedule type') ?? kv.get('Scheduler');
  if (scheduler) fields.scheduler = scheduler;

  const cfg = coerceFloat(kv.get('CFG scale'));
  if (cfg != null) fields.cfg_scale = cfg;

  const size = parseSize(kv.get('Size'));
  if (size) {
    fields.width = size.width;
    fields.height = size.height;
  }

  const seed = coerceInt(kv.get('Seed'));
  if (seed != null) fields.seed = seed;

  // Hires-fix
  const hiresUpscale = coerceFloat(kv.get('Hires upscale'));
  const hiresUpscaler = kv.get('Hires upscaler');
  const denoise = coerceFloat(kv.get('Denoising strength'));
  if (hiresUpscale != null || hiresUpscaler || denoise != null) {
    fields.enable_hr = true;
    if (hiresUpscale != null) fields.hr_scale = hiresUpscale;
    if (hiresUpscaler) fields.hr_upscaler = hiresUpscaler;
    if (denoise != null) fields.denoising_strength = denoise;
  }

  const recognised = new Set([
    'Steps',
    'Sampler',
    'Schedule type',
    'Scheduler',
    'CFG scale',
    'Size',
    'Seed',
    'Hires upscale',
    'Hires upscaler',
    'Denoising strength',
  ]);
  const unrecognised: Record<string, string> = {};
  for (const [k, v] of kv) {
    if (!recognised.has(k)) unrecognised[k] = v;
  }

  return { fields, rawText: text, unrecognised };
}

import { readFile } from 'node:fs/promises';
import type { PngInfoResult } from '../../shared/api/schemas.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface TextChunk {
  keyword: string;
  text: string;
}

function readTextChunks(buf: Buffer): TextChunk[] {
  if (buf.length < PNG_SIGNATURE.length) return [];
  if (!buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return [];

  const chunks: TextChunk[] = [];
  let off = PNG_SIGNATURE.length;
  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;
    const data = buf.subarray(dataStart, dataEnd);

    if (type === 'tEXt') {
      const sep = data.indexOf(0x00);
      if (sep > 0) {
        chunks.push({
          keyword: data.subarray(0, sep).toString('latin1'),
          text: data.subarray(sep + 1).toString('utf8'),
        });
      }
    } else if (type === 'iTXt') {
      // iTXt layout: keyword\0 compFlag(1) compMethod(1) langTag\0 translatedKeyword\0 text
      const k = data.indexOf(0x00);
      if (k > 0 && k + 2 < data.length) {
        const compFlag = data[k + 1] ?? 0;
        const langStart = k + 3;
        const langEnd = data.indexOf(0x00, langStart);
        if (langEnd >= langStart) {
          const transEnd = data.indexOf(0x00, langEnd + 1);
          if (transEnd > langEnd && compFlag === 0) {
            chunks.push({
              keyword: data.subarray(0, k).toString('latin1'),
              text: data.subarray(transEnd + 1).toString('utf8'),
            });
          }
        }
      }
    }

    if (type === 'IEND') break;
    off = dataEnd + 4;
  }
  return chunks;
}

function splitParamsLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim().length > 0) out.push(cur.trim());
  return out;
}

const PARAMS_LINE_HINT = /(^|, )(Steps|Sampler|Schedule type|CFG scale|Seed|Size|Model|Model hash|Version): /;

function parseParameters(raw: string): {
  prompt: string;
  negativePrompt: string;
  parameters: Record<string, string>;
} {
  const lines = raw.split(/\r?\n/);
  let paramsLineIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (PARAMS_LINE_HINT.test(lines[i]!)) {
      paramsLineIdx = i;
      break;
    }
  }

  const promptLines: string[] = [];
  const negLines: string[] = [];
  let inNeg = false;
  const headerEnd = paramsLineIdx === -1 ? lines.length : paramsLineIdx;
  for (let i = 0; i < headerEnd; i++) {
    const line = lines[i]!;
    if (!inNeg && line.startsWith('Negative prompt: ')) {
      inNeg = true;
      negLines.push(line.slice('Negative prompt: '.length));
    } else if (inNeg) {
      negLines.push(line);
    } else {
      promptLines.push(line);
    }
  }

  const parameters: Record<string, string> = {};
  if (paramsLineIdx !== -1) {
    for (const part of splitParamsLine(lines[paramsLineIdx]!)) {
      const colon = part.indexOf(': ');
      if (colon > 0) {
        const key = part.slice(0, colon).trim();
        const value = part.slice(colon + 2).trim();
        parameters[key] = value;
      }
    }
  }

  return {
    prompt: promptLines.join('\n').trimEnd(),
    negativePrompt: negLines.join('\n').trimEnd(),
    parameters,
  };
}

export function parsePngInfoText(raw: string): PngInfoResult {
  const { prompt, negativePrompt, parameters } = parseParameters(raw);
  return { prompt, negativePrompt, parameters, raw };
}

export async function readPngInfo(filePath: string): Promise<PngInfoResult | null> {
  let buf: Buffer;
  try {
    buf = await readFile(filePath);
  } catch {
    return null;
  }
  const chunks = readTextChunks(buf);
  if (chunks.length === 0) return null;
  const params = chunks.find((c) => c.keyword === 'parameters');
  if (!params) return null;
  return parsePngInfoText(params.text);
}

import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePngInfoText, readPngInfo } from '../pngInfo.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      c >>>= 0;
    }
    t.push(c);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildPng(textChunks: Array<{ keyword: string; text: string }> = []): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const parts: Buffer[] = [PNG_SIGNATURE, chunk('IHDR', ihdr)];
  for (const { keyword, text } of textChunks) {
    parts.push(
      chunk(
        'tEXt',
        Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.from([0]), Buffer.from(text, 'utf8')]),
      ),
    );
  }
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

describe('parsePngInfoText — A1111/Forge "parameters" format', () => {
  it('parses a typical SD generation', () => {
    const raw =
      'a cute cat sitting on a couch\n' +
      'Negative prompt: blurry, lowres\n' +
      'Steps: 20, Sampler: Euler a, Schedule type: Karras, CFG scale: 7, Seed: 1234567890, Size: 512x768, Model: v1-5-pruned, Version: f1.7.0';
    const r = parsePngInfoText(raw);
    expect(r.prompt).toBe('a cute cat sitting on a couch');
    expect(r.negativePrompt).toBe('blurry, lowres');
    expect(r.parameters.Steps).toBe('20');
    expect(r.parameters.Sampler).toBe('Euler a');
    expect(r.parameters['Schedule type']).toBe('Karras');
    expect(r.parameters['CFG scale']).toBe('7');
    expect(r.parameters.Seed).toBe('1234567890');
    expect(r.parameters.Size).toBe('512x768');
    expect(r.parameters.Model).toBe('v1-5-pruned');
    expect(r.raw).toBe(raw);
  });

  it('respects quoted commas in Lora hashes', () => {
    const raw =
      'subject\n' +
      'Steps: 20, Sampler: DPM++ 2M, Seed: 1, Lora hashes: "lora1: abc, lora2: def", Model: foo';
    const r = parsePngInfoText(raw);
    expect(r.parameters['Lora hashes']).toBe('"lora1: abc, lora2: def"');
    expect(r.parameters.Sampler).toBe('DPM++ 2M');
    expect(r.parameters.Model).toBe('foo');
  });

  it('handles multi-line prompts', () => {
    const raw =
      'first line\nsecond line\nthird line\n' +
      'Negative prompt: bad\nartifacts\n' +
      'Steps: 10, Sampler: Euler, Seed: 7';
    const r = parsePngInfoText(raw);
    expect(r.prompt).toBe('first line\nsecond line\nthird line');
    expect(r.negativePrompt).toBe('bad\nartifacts');
    expect(r.parameters.Steps).toBe('10');
  });

  it('handles missing negative prompt', () => {
    const raw = 'just a prompt\nSteps: 5, Sampler: Euler, Seed: 1';
    const r = parsePngInfoText(raw);
    expect(r.prompt).toBe('just a prompt');
    expect(r.negativePrompt).toBe('');
    expect(r.parameters.Seed).toBe('1');
  });
});

describe('readPngInfo — file IO', () => {
  const dir = mkdtempSync(join(tmpdir(), 'png-info-test-'));

  it('extracts parameters from a tEXt chunk', async () => {
    const params =
      'a tree\nNegative prompt: leaves\nSteps: 30, Sampler: Euler a, Seed: 9';
    const file = join(dir, 'with-info.png');
    writeFileSync(file, buildPng([{ keyword: 'parameters', text: params }]));
    const r = await readPngInfo(file);
    expect(r).not.toBeNull();
    expect(r?.prompt).toBe('a tree');
    expect(r?.negativePrompt).toBe('leaves');
    expect(r?.parameters.Steps).toBe('30');
  });

  it('returns null for a PNG without a parameters chunk', async () => {
    const file = join(dir, 'no-info.png');
    writeFileSync(file, buildPng([{ keyword: 'Software', text: 'Forge' }]));
    expect(await readPngInfo(file)).toBeNull();
  });

  it('returns null for a non-PNG file', async () => {
    const file = join(dir, 'not-png.png');
    writeFileSync(file, Buffer.from('this is not a png'));
    expect(await readPngInfo(file)).toBeNull();
  });

  it('returns null when the file does not exist', async () => {
    expect(await readPngInfo(join(dir, 'missing.png'))).toBeNull();
  });
});

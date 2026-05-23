import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import { crc32 } from 'node:zlib';
import { parsePngTextChunks } from '../pngTextChunks.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function tEXt(keyword: string, value: string): Buffer {
  const k = Buffer.from(keyword, 'latin1');
  const v = Buffer.from(value, 'latin1');
  return chunk('tEXt', Buffer.concat([k, Buffer.from([0]), v]));
}

function iTXt(keyword: string, value: string): Buffer {
  const k = Buffer.from(keyword, 'latin1');
  // null sep | compression_flag=0 | compression_method=0 | lang\0 | translated\0 | text(utf8)
  const data = Buffer.concat([
    k,
    Buffer.from([0, 0, 0]),
    Buffer.from([0]), // empty lang
    Buffer.from([0]), // empty translated keyword
    Buffer.from(value, 'utf8'),
  ]);
  return chunk('iTXt', data);
}

function ihdr(): Buffer {
  // Minimal but valid-shaped IHDR; the parser does not validate IHDR contents.
  return chunk(
    'IHDR',
    Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]),
  );
}

function iend(): Buffer {
  return chunk('IEND', Buffer.alloc(0));
}

describe('parsePngTextChunks', () => {
  it('extracts a tEXt chunk with the "parameters" keyword', () => {
    const buf = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(),
      tEXt('parameters', 'a photo of an astronaut\nSteps: 20, Seed: 42'),
      iend(),
    ]);
    const out = parsePngTextChunks(buf);
    expect(out.parameters).toBe('a photo of an astronaut\nSteps: 20, Seed: 42');
  });

  it('extracts iTXt with UTF-8 content (compression flag = 0)', () => {
    const buf = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(),
      iTXt('parameters', 'jardín, 風景, prompt'),
      iend(),
    ]);
    const out = parsePngTextChunks(buf);
    expect(out.parameters).toBe('jardín, 風景, prompt');
  });

  it('returns {} for a non-PNG buffer', () => {
    const out = parsePngTextChunks(Buffer.from('not a png at all'));
    expect(out).toEqual({});
  });

  it('returns {} for an empty buffer', () => {
    expect(parsePngTextChunks(new Uint8Array())).toEqual({});
  });

  it('tolerates a truncated chunk without throwing', () => {
    const full = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(),
      tEXt('parameters', 'hello world'),
      iend(),
    ]);
    // chop off the last 5 bytes to truncate the IEND chunk
    const truncated = full.subarray(0, full.length - 5);
    const out = parsePngTextChunks(truncated);
    expect(out.parameters).toBe('hello world');
  });

  it('halts at IEND and ignores trailing junk', () => {
    const buf = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(),
      tEXt('parameters', 'first'),
      iend(),
      Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]),
    ]);
    const out = parsePngTextChunks(buf);
    expect(out.parameters).toBe('first');
  });

  it('reads multiple text chunks', () => {
    const buf = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(),
      tEXt('parameters', 'p'),
      tEXt('Software', 'Forge'),
      iend(),
    ]);
    const out = parsePngTextChunks(buf);
    expect(out.parameters).toBe('p');
    expect(out.Software).toBe('Forge');
  });
});

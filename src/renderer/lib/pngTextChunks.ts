const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readUint32BE(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset]! << 24) |
      (buf[offset + 1]! << 16) |
      (buf[offset + 2]! << 8) |
      buf[offset + 3]!) >>>
    0
  );
}

function decodeLatin1(buf: Uint8Array): string {
  let out = '';
  for (let i = 0; i < buf.length; i += 1) out += String.fromCharCode(buf[i]!);
  return out;
}

const utf8 = new TextDecoder('utf-8', { fatal: false });

function splitOnNull(buf: Uint8Array): [Uint8Array, Uint8Array] | null {
  const nul = buf.indexOf(0);
  if (nul < 0) return null;
  return [buf.subarray(0, nul), buf.subarray(nul + 1)];
}

export function parsePngTextChunks(input: ArrayBuffer | Uint8Array): Record<string, string> {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buf.length < 8) return {};
  for (let i = 0; i < 8; i += 1) {
    if (buf[i] !== PNG_SIGNATURE[i]) return {};
  }

  const out: Record<string, string> = {};
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = readUint32BE(buf, offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break; // truncated; stop gracefully
    const type = decodeLatin1(buf.subarray(typeStart, dataStart));
    const data = buf.subarray(dataStart, dataEnd);

    if (type === 'tEXt') {
      const parts = splitOnNull(data);
      if (parts) {
        const [k, v] = parts;
        out[decodeLatin1(k)] = decodeLatin1(v);
      }
    } else if (type === 'iTXt') {
      const kw = splitOnNull(data);
      if (kw) {
        const [keyword, rest] = kw;
        // rest: compression_flag (1) | compression_method (1) | language_tag\0 | translated_keyword\0 | text
        if (rest.length >= 2) {
          const compressionFlag = rest[0]!;
          const afterFlags = rest.subarray(2);
          const lang = splitOnNull(afterFlags);
          if (lang) {
            const tk = splitOnNull(lang[1]);
            if (tk) {
              const text = tk[1];
              if (compressionFlag === 0) {
                out[decodeLatin1(keyword)] = utf8.decode(text);
              }
              // compressed iTXt is rare in A1111 output; skip silently.
            }
          }
        }
      }
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // skip CRC
  }
  return out;
}

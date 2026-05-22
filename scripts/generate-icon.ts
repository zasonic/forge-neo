/**
 * One-shot icon converter. Reads resources/icons/icon.jpeg and writes:
 *   - resources/icons/icon.png  (256x256, for NSIS sidebar + future macOS/Linux)
 *   - resources/icons/icon.ico  (multi-size 16/32/48/64/128/256 for Windows)
 *
 * Skips work when the existing outputs are newer than the source jpeg.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import toIco from 'to-ico';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, 'resources/icons/icon.jpeg');
const PNG_OUT = resolve(ROOT, 'resources/icons/icon.png');
const ICO_OUT = resolve(ROOT, 'resources/icons/icon.ico');
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function mtimeOrZero(path: string): Promise<number> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return 0;
  }
}

async function main(): Promise<void> {
  const sourceMtime = await mtimeOrZero(SOURCE);
  if (sourceMtime === 0) {
    throw new Error(`source missing: ${SOURCE}`);
  }
  const pngMtime = await mtimeOrZero(PNG_OUT);
  const icoMtime = await mtimeOrZero(ICO_OUT);
  if (pngMtime > sourceMtime && icoMtime > sourceMtime) {
    process.stdout.write('icon up to date\n');
    return;
  }

  await mkdir(dirname(PNG_OUT), { recursive: true });

  const png256 = await sharp(SOURCE).resize(256, 256, { fit: 'cover' }).png().toBuffer();
  await writeFile(PNG_OUT, png256);

  const buffers = await Promise.all(
    ICO_SIZES.map((size) => sharp(SOURCE).resize(size, size, { fit: 'cover' }).png().toBuffer()),
  );
  const ico = await toIco(buffers);
  await writeFile(ICO_OUT, ico);

  process.stdout.write(`wrote ${PNG_OUT} (${png256.length} B) and ${ICO_OUT} (${ico.length} B)\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});

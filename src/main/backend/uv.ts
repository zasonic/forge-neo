import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export function resolveUvBinary(): string {
  const resourcesPath = process.resourcesPath;
  const packaged = app.isPackaged ? join(resourcesPath, 'bin', 'uv.exe') : null;
  if (packaged && existsSync(packaged)) return packaged;

  const dev = join(app.getAppPath(), 'resources', 'bin', 'uv.exe');
  if (existsSync(dev)) return dev;

  throw new Error(
    `uv binary not found. Expected at resources/bin/uv.exe (dev) or ${packaged ?? '<packaged resources>/bin/uv.exe'}. ` +
    `Run the vendor step to populate it before launching.`,
  );
}

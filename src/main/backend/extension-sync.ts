import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

function bundledExtensionRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'extension', 'forge-neo-api');
  }
  return join(app.getAppPath(), 'resources', 'extension', 'forge-neo-api');
}

export async function syncExtension(extensionsDir: string): Promise<void> {
  const source = bundledExtensionRoot();
  if (!existsSync(source)) {
    throw new Error(`vendored extension missing at ${source}`);
  }
  const target = join(extensionsDir, 'forge-neo-api');
  await mkdir(extensionsDir, { recursive: true });
  await cp(source, target, { recursive: true, force: true, dereference: false });
}

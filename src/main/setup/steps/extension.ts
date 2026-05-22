import { app } from 'electron';
import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';

function vendoredExtensionDir(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'extension', 'forge-neo-api');
  return join(app.getAppPath(), 'resources', 'extension', 'forge-neo-api');
}

export async function installExtension(opts: {
  paths: InstallPaths;
  onLog: (line: LogLine) => void;
}): Promise<void> {
  const src = vendoredExtensionDir();
  const dest = opts.paths.ourExtension;
  opts.onLog({ stream: 'app', text: `copying ${src} → ${dest}`, ts: Date.now() });
  await mkdir(opts.paths.extensions, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
}

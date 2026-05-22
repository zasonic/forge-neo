import { app } from 'electron';
import { join } from 'node:path';

export function resolveBundledBinary(name: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'bin', name);
  }
  return join(app.getAppPath(), 'resources', 'bin', name);
}

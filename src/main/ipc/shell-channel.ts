import { ipcMain, shell } from 'electron';
import { isAbsolute, relative, resolve } from 'node:path';
import { IPC } from '../../shared/ipc/contract.js';
import { settingsStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  if (rel === '' || rel === '..') return rel === '';
  return !rel.startsWith('..') && !isAbsolute(rel);
}

export function registerShellChannel(): void {
  ipcMain.handle(IPC.shell.showItemInFolder, (_e, target: unknown) => {
    if (typeof target !== 'string' || target.length === 0) return false;
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    const allowedRoot = resolve(paths.outputs);
    const resolved = resolve(target);
    if (!isInside(allowedRoot, resolved)) return false;
    shell.showItemInFolder(resolved);
    return true;
  });
}

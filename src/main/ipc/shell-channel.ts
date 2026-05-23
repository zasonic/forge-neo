import { ipcMain, shell } from 'electron';
import { resolve } from 'node:path';
import { IPC } from '../../shared/ipc/contract.js';
import { settingsStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';

export function registerShellChannel(): void {
  ipcMain.handle(IPC.shell.showItemInFolder, (_e, target: unknown) => {
    if (typeof target !== 'string' || target.length === 0) return false;
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    const allowedRoot = resolve(paths.outputs);
    const resolved = resolve(target);
    if (!resolved.startsWith(allowedRoot)) return false;
    shell.showItemInFolder(resolved);
    return true;
  });
}

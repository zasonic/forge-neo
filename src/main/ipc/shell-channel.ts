import { ipcMain, shell } from 'electron';
import path from 'node:path';
import { IPC } from '../../shared/ipc/contract.js';
import { settingsStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';

export function registerShellChannel(): void {
  ipcMain.handle(IPC.shell.showItemInFolder, (_e, target: unknown) => {
    if (typeof target !== 'string' || target.length === 0) return false;
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    const allowedRoot = path.resolve(paths.outputs);
    const resolved = path.resolve(target);
    if (resolved !== allowedRoot && !resolved.startsWith(allowedRoot + path.sep)) return false;
    shell.showItemInFolder(resolved);
    return true;
  });
}

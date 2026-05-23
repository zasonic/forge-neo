import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc/contract.js';
import type { StepName } from '../../shared/constants.js';
import type { Installer } from '../backend/installer.js';

export function registerInstallerChannel(win: BrowserWindow, installer: Installer): void {
  ipcMain.handle(IPC.installer.state, () => installer.getState());
  ipcMain.handle(IPC.installer.runFrom, (_e, start?: StepName) => installer.runFrom(start));
  ipcMain.handle(IPC.installer.cancel, () => installer.cancel());
  ipcMain.handle(IPC.installer.reset, () => installer.reset());
  ipcMain.handle(IPC.installer.setByoPython, (_e, path: string | null) =>
    installer.setByoPython(path),
  );

  installer.on('event', (event) => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC.installer.event, event);
  });
}

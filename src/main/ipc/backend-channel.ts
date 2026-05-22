import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc/contract.js';
import type { Supervisor } from '../backend/supervisor.js';

export function registerBackendChannel(win: BrowserWindow, supervisor: Supervisor): void {
  ipcMain.handle(IPC.backend.start, () => supervisor.start());
  ipcMain.handle(IPC.backend.stop, () => supervisor.stop());
  ipcMain.handle(IPC.backend.restart, () => supervisor.restart());
  ipcMain.handle(IPC.backend.statusGet, () => supervisor.getStatus());

  supervisor.on('status', (status) => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC.backend.statusEvent, status);
  });
  supervisor.on('log', (line) => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC.backend.logEvent, line);
  });
}

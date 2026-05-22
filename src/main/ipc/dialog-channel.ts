import { dialog, ipcMain, type BrowserWindow } from 'electron';
import { readFile } from 'node:fs/promises';
import { IPC } from '../../shared/ipc/contract.js';

export function registerDialogChannel(win: BrowserWindow): void {
  ipcMain.handle(IPC.dialog.openImage, async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    const buf = await readFile(path);
    return { path, dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  });

  ipcMain.handle(IPC.dialog.openDirectory, async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0]!;
  });
}

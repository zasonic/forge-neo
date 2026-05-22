import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc/contract.js';
import type { SetupOrchestrator } from '../setup/orchestrator.js';
import { runPreflight } from '../setup/preflight.js';
import { settingsStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';

export function registerSetupChannel(win: BrowserWindow, orchestrator: SetupOrchestrator): void {
  ipcMain.handle(IPC.setup.getProgress, () => orchestrator.getProgress());
  ipcMain.handle(IPC.setup.start, () => void orchestrator.start());
  ipcMain.handle(IPC.setup.cancel, () => orchestrator.cancel());
  ipcMain.handle(IPC.setup.listModels, () => orchestrator.getModelOptions());
  ipcMain.handle(IPC.setup.setSelectedModels, (_e, ids: string[]) => orchestrator.setSelectedModels(ids));
  ipcMain.handle(IPC.setup.setInstallRoot, (_e, root: string) => {
    settingsStore.set('installRoot', root);
  });
  ipcMain.handle(IPC.setup.preflight, async () => {
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    return runPreflight(paths.root);
  });

  orchestrator.on('progress', (event) => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC.setup.progressEvent, event);
  });
  orchestrator.on('log', (line) => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC.setup.logEvent, line);
  });
}

import { ipcMain } from 'electron';
import { IPC, type SettingsShape } from '../../shared/ipc/contract.js';
import { settingsStore } from '../config/store.js';

export function registerSettingsChannel(): void {
  ipcMain.handle(IPC.settings.get, () => settingsStore.store);
  ipcMain.handle(IPC.settings.set, (_e, patch: Partial<SettingsShape>) => {
    for (const [k, v] of Object.entries(patch)) {
      settingsStore.set(k as keyof SettingsShape, v as never);
    }
    return settingsStore.store;
  });
}

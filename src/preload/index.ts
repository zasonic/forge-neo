import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type BackendStatus, type LogLine, type SettingsShape } from '../shared/ipc/contract.js';

const bridge = {
  backend: {
    start: (): Promise<void> => ipcRenderer.invoke(IPC.backend.start),
    stop: (): Promise<void> => ipcRenderer.invoke(IPC.backend.stop),
    restart: (): Promise<void> => ipcRenderer.invoke(IPC.backend.restart),
    getStatus: (): Promise<BackendStatus> => ipcRenderer.invoke(IPC.backend.statusGet),
    onStatus: (cb: (s: BackendStatus) => void): (() => void) => {
      const fn = (_: unknown, s: BackendStatus): void => cb(s);
      ipcRenderer.on(IPC.backend.statusEvent, fn);
      return () => ipcRenderer.off(IPC.backend.statusEvent, fn);
    },
    onLog: (cb: (line: LogLine) => void): (() => void) => {
      const fn = (_: unknown, l: LogLine): void => cb(l);
      ipcRenderer.on(IPC.backend.logEvent, fn);
      return () => ipcRenderer.off(IPC.backend.logEvent, fn);
    },
  },
  fs: {
    scanOutputs: (): Promise<unknown> => ipcRenderer.invoke(IPC.fs.scanOutputs),
    scanModels: (kind: 'checkpoints' | 'loras' | 'vae' | 'embeddings'): Promise<unknown> =>
      ipcRenderer.invoke(IPC.fs.scanModels, kind),
    watchOutputs: (): Promise<boolean> => ipcRenderer.invoke(IPC.fs.watchOutputs),
    onOutputsChanged: (cb: () => void): (() => void) => {
      const fn = (): void => cb();
      ipcRenderer.on(IPC.fs.outputsEvent, fn);
      return () => ipcRenderer.off(IPC.fs.outputsEvent, fn);
    },
  },
  dialog: {
    openImage: (): Promise<{ path: string; dataUrl: string } | null> => ipcRenderer.invoke(IPC.dialog.openImage),
  },
  settings: {
    get: (): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.get),
    set: (patch: Partial<SettingsShape>): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.set, patch),
  },
};

contextBridge.exposeInMainWorld('forge', bridge);

export type ForgeBridge = typeof bridge;

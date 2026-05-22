import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  type BackendStatus,
  type LogLine,
  type ModelOption,
  type PreflightReport,
  type SettingsShape,
  type SetupProgressEvent,
} from '../shared/ipc/contract.js';

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
    openDirectory: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.dialog.openDirectory, defaultPath),
  },
  settings: {
    get: (): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.get),
    set: (patch: Partial<SettingsShape>): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.set, patch),
  },
  setup: {
    getProgress: (): Promise<SetupProgressEvent> => ipcRenderer.invoke(IPC.setup.getProgress),
    start: (): Promise<void> => ipcRenderer.invoke(IPC.setup.start),
    cancel: (): Promise<void> => ipcRenderer.invoke(IPC.setup.cancel),
    setInstallRoot: (root: string): Promise<void> => ipcRenderer.invoke(IPC.setup.setInstallRoot, root),
    listModels: (): Promise<ModelOption[]> => ipcRenderer.invoke(IPC.setup.listModels),
    setSelectedModels: (ids: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC.setup.setSelectedModels, ids),
    preflight: (): Promise<PreflightReport> => ipcRenderer.invoke(IPC.setup.preflight),
    onProgress: (cb: (event: SetupProgressEvent) => void): (() => void) => {
      const fn = (_: unknown, event: SetupProgressEvent): void => cb(event);
      ipcRenderer.on(IPC.setup.progressEvent, fn);
      return () => ipcRenderer.off(IPC.setup.progressEvent, fn);
    },
    onLog: (cb: (line: LogLine) => void): (() => void) => {
      const fn = (_: unknown, line: LogLine): void => cb(line);
      ipcRenderer.on(IPC.setup.logEvent, fn);
      return () => ipcRenderer.off(IPC.setup.logEvent, fn);
    },
  },
};

contextBridge.exposeInMainWorld('forge', bridge);

export type ForgeBridge = typeof bridge;

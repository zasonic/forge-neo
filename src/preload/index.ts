import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type BackendStatus, type LogLine, type SettingsShape, type InstallerEvent, type InstallerState } from '../shared/ipc/contract.js';
import type { StepName } from '../shared/constants.js';
import type { PngInfoResult } from '../shared/api/schemas.js';

export interface OutputEntry {
  path: string;
  mtimeMs: number;
  sizeBytes: number;
}

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
    scanOutputs: (): Promise<OutputEntry[]> => ipcRenderer.invoke(IPC.fs.scanOutputs),
    scanModels: (kind: 'checkpoints' | 'loras' | 'vae' | 'embeddings'): Promise<OutputEntry[]> =>
      ipcRenderer.invoke(IPC.fs.scanModels, kind),
    watchOutputs: (): Promise<boolean> => ipcRenderer.invoke(IPC.fs.watchOutputs),
    onOutputsChanged: (cb: () => void): (() => void) => {
      const fn = (): void => cb();
      ipcRenderer.on(IPC.fs.outputsEvent, fn);
      return () => ipcRenderer.off(IPC.fs.outputsEvent, fn);
    },
    readPngInfo: (path: string): Promise<PngInfoResult | null> =>
      ipcRenderer.invoke(IPC.fs.readPngInfo, path),
    showItemInFolder: (path: string): Promise<void> =>
      ipcRenderer.invoke(IPC.fs.showItemInFolder, path),
  },
  dialog: {
    openImage: (): Promise<{ path: string; dataUrl: string } | null> =>
      ipcRenderer.invoke(IPC.dialog.openImage),
    openDirectory: (): Promise<string | null> => ipcRenderer.invoke(IPC.dialog.openDirectory),
  },
  settings: {
    get: (): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.get),
    set: (patch: Partial<SettingsShape>): Promise<SettingsShape> => ipcRenderer.invoke(IPC.settings.set, patch),
  },
  installer: {
    state: (): Promise<InstallerState> => ipcRenderer.invoke(IPC.installer.state),
    runFrom: (step?: StepName): Promise<void> => ipcRenderer.invoke(IPC.installer.runFrom, step),
    cancel: (): Promise<void> => ipcRenderer.invoke(IPC.installer.cancel),
    reset: (): Promise<void> => ipcRenderer.invoke(IPC.installer.reset),
    setByoPython: (path: string | null): Promise<void> =>
      ipcRenderer.invoke(IPC.installer.setByoPython, path),
    onEvent: (cb: (e: InstallerEvent) => void): (() => void) => {
      const fn = (_: unknown, e: InstallerEvent): void => cb(e);
      ipcRenderer.on(IPC.installer.event, fn);
      return () => ipcRenderer.off(IPC.installer.event, fn);
    },
  },
};

contextBridge.exposeInMainWorld('forge', bridge);

export type ForgeBridge = typeof bridge;

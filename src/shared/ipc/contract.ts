import type { StepName } from '../constants.js';

export type BackendStatus =
  | { kind: 'idle' }
  | { kind: 'starting'; pid?: number }
  | { kind: 'ready'; pid: number; port: number; baseUrl: string }
  | { kind: 'crashed'; code: number | null; signal: NodeJS.Signals | null }
  | { kind: 'stopping' };

export interface LogLine {
  stream: 'stdout' | 'stderr' | 'app';
  text: string;
  ts: number;
}

export type InstallerEvent =
  | { kind: 'step-start'; step: StepName }
  | { kind: 'progress'; step: StepName; percent: number | null; message: string }
  | { kind: 'log'; step: StepName; line: string }
  | { kind: 'step-complete'; step: StepName }
  | { kind: 'step-failed'; step: StepName; error: string }
  | { kind: 'done' }
  | { kind: 'cancelled' };

export interface InstallerState {
  lastCompletedStep: StepName | null;
  current: StepName | null;
  running: boolean;
  installedAt: number | null;
  upstreamSha: string | null;
  completedTorchSpecs: string[];
  byoPython: string | null;
}

export const IPC = {
  backend: {
    start: 'backend:start',
    stop: 'backend:stop',
    restart: 'backend:restart',
    statusGet: 'backend:status:get',
    statusEvent: 'backend:status:event',
    logEvent: 'backend:log:event',
  },
  fs: {
    scanOutputs: 'fs:scanOutputs',
    scanModels: 'fs:scanModels',
    watchOutputs: 'fs:watchOutputs',
    outputsEvent: 'fs:outputs:event',
    readPngInfo: 'fs:readPngInfo',
    showItemInFolder: 'fs:showItemInFolder',
  },
  dialog: {
    openImage: 'dialog:openImage',
    openDirectory: 'dialog:openDirectory',
  },
  settings: {
    get: 'settings:get',
    set: 'settings:set',
  },
  installer: {
    state: 'installer:state',
    runFrom: 'installer:runFrom',
    cancel: 'installer:cancel',
    reset: 'installer:reset',
    setByoPython: 'installer:setByoPython',
    event: 'installer:event',
  },
} as const;

export interface SettingsShape {
  installRoot: string;
  autoStartBackend: boolean;
  apiAuth: { user: string; pass: string } | null;
  liveProgressEnabled: boolean;
  port: number | null;
  extensionEnabled: boolean;
  autoUpdate: boolean;
}

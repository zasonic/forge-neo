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
  },
  dialog: {
    openImage: 'dialog:openImage',
  },
  settings: {
    get: 'settings:get',
    set: 'settings:set',
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

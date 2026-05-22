import Store from 'electron-store';
import { app } from 'electron';
import { join } from 'node:path';
import type { SettingsShape } from '../../shared/ipc/contract.js';

const defaults: SettingsShape = {
  installRoot: join(app.getPath('appData'), 'forge-neo'),
  autoStartBackend: true,
  apiAuth: null,
  liveProgressEnabled: true,
  port: null,
  extensionEnabled: true,
  autoUpdate: false,
  setupFirstLaunchTimeoutMs: null,
};

export const settingsStore = new Store<SettingsShape>({
  name: 'settings',
  defaults,
});

export interface SetupProgress {
  lastCompletedStep: string | null;
  installedAt: number | null;
  upstreamSha: string | null;
  upstreamShaFetchedAt: number | null;
  selectedModelIds: string[];
}

export const setupStore = new Store<SetupProgress>({
  name: 'setup',
  defaults: {
    lastCompletedStep: null,
    installedAt: null,
    upstreamSha: null,
    upstreamShaFetchedAt: null,
    selectedModelIds: [],
  },
});

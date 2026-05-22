import Store from 'electron-store';
import { app } from 'electron';
import { join } from 'node:path';
import type { SettingsShape } from '../../shared/ipc/contract.js';
import type { StepName } from '../../shared/constants.js';

const defaults: SettingsShape = {
  installRoot: join(app.getPath('appData'), 'forge-neo'),
  autoStartBackend: true,
  apiAuth: null,
  liveProgressEnabled: true,
  port: null,
  extensionEnabled: true,
  autoUpdate: false,
};

export const settingsStore = new Store<SettingsShape>({
  name: 'settings',
  defaults,
});

export interface SetupProgress {
  lastCompletedStep: StepName | null;
  installedAt: number | null;
  upstreamSha: string | null;
  completedTorchSpecs: string[];
  byoPython: string | null;
}

export const setupStore = new Store<SetupProgress>({
  name: 'setup',
  defaults: {
    lastCompletedStep: null,
    installedAt: null,
    upstreamSha: null,
    completedTorchSpecs: [],
    byoPython: null,
  },
});

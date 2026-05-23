import { app, BrowserWindow, session } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Supervisor } from './backend/supervisor.js';
import { Installer } from './backend/installer.js';
import { settingsStore, setupStore } from './config/store.js';
import { registerBackendChannel } from './ipc/backend-channel.js';
import { registerSettingsChannel } from './ipc/settings-channel.js';
import { registerDialogChannel } from './ipc/dialog-channel.js';
import { registerFsChannel } from './ipc/fs-channel.js';
import { registerInstallerChannel } from './ipc/installer-channel.js';
import { registerShellChannel } from './ipc/shell-channel.js';
import { FORGE_IMG_SCHEME, registerForgeImgProtocol, registerForgeImgPrivileged } from './protocols/forge-img.js';
import { resolveInstallPaths } from '../shared/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

registerForgeImgPrivileged();

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;
let supervisor: Supervisor | null = null;

function buildCsp(): string {
  const dev = isDev ? "'unsafe-eval' 'unsafe-inline'" : '';
  const connect = ["'self'", 'http://127.0.0.1:*', 'ws://127.0.0.1:*', `${FORGE_IMG_SCHEME}:`];
  if (isDev) connect.push('ws://localhost:*');
  return [
    `default-src 'self'`,
    `script-src 'self' ${dev}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${FORGE_IMG_SCHEME}:`,
    `connect-src ${connect.join(' ')}`,
    `worker-src 'self' blob:`,
  ].join('; ');
}

async function createWindow(): Promise<void> {
  registerForgeImgProtocol();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildCsp()],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0c0f',
    autoHideMenuBar: true,
    webPreferences: {
      // .mjs extension is required to load this as ESM. Electron's preload
      // loader uses require() under the hood and would otherwise hit
      // ERR_REQUIRE_ESM and silently leave window.forge undefined.
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false because the preload is compiled as ESM (the whole project
      // is `"type": "module"`). Sandboxed preloads must be CJS — they fail to
      // load silently otherwise, leaving window.forge undefined and the
      // renderer crashing on first IPC call. contextIsolation stays on, which
      // is the main boundary that keeps preload internals out of the renderer.
      sandbox: false,
      webviewTag: false,
    },
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL);
    if (!allowed) e.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const paths = resolveInstallPaths(settingsStore.get('installRoot'));
  supervisor = new Supervisor(paths);
  const installer = new Installer(supervisor);

  registerBackendChannel(mainWindow, supervisor);
  registerSettingsChannel();
  registerDialogChannel(mainWindow);
  registerFsChannel(mainWindow);
  registerInstallerChannel(mainWindow, installer);
  registerShellChannel();

  if (DEV_SERVER_URL) {
    await mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  const installed = setupStore.get('installedAt') != null;
  if (installed && settingsStore.get('autoStartBackend')) {
    supervisor.start().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[supervisor] auto-start failed:', msg);
      supervisor?.emit('log', { stream: 'app', text: `auto-start failed: ${msg}`, ts: Date.now() });
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (e) => {
  if (!supervisor) return;
  e.preventDefault();
  await supervisor.stop().catch(() => {});
  app.exit(0);
});

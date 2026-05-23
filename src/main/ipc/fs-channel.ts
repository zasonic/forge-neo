import { ipcMain, shell, type BrowserWindow } from 'electron';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import { IPC } from '../../shared/ipc/contract.js';
import { settingsStore } from '../config/store.js';
import { resolveInstallPaths } from '../../shared/paths.js';
import { readPngInfo } from '../lib/pngInfo.js';

const WATCH_DEPTH = 3;
const DEBOUNCE_MS = 250;

export interface OutputEntry {
  path: string;
  mtimeMs: number;
  sizeBytes: number;
}

async function scanDir(root: string, depth: number): Promise<OutputEntry[]> {
  if (!existsSync(root)) return [];
  const out: OutputEntry[] = [];
  async function walk(dir: string, d: number): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (d > 0) await walk(p, d - 1);
      } else if (/\.(png|jpe?g|webp)$/i.test(e.name)) {
        const s = await stat(p);
        out.push({ path: p, mtimeMs: s.mtimeMs, sizeBytes: s.size });
      }
    }
  }
  await walk(root, depth);
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

let activeWatcher: FSWatcher | null = null;

export function registerFsChannel(win: BrowserWindow): void {
  ipcMain.handle(IPC.fs.scanOutputs, async () => {
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    return scanDir(paths.outputs, WATCH_DEPTH);
  });

  ipcMain.handle(IPC.fs.scanModels, async (_e, kind: 'checkpoints' | 'loras' | 'vae' | 'embeddings') => {
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    const target = {
      checkpoints: paths.models,
      loras: paths.loras,
      vae: paths.vae,
      embeddings: paths.embeddings,
    }[kind];
    return scanDir(target, 2);
  });

  ipcMain.handle(IPC.fs.watchOutputs, async () => {
    await activeWatcher?.close();
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    if (!existsSync(paths.outputs)) return false;

    let pending: NodeJS.Timeout | null = null;
    const fire = (): void => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        if (!win.isDestroyed()) win.webContents.send(IPC.fs.outputsEvent);
      }, DEBOUNCE_MS);
    };

    activeWatcher = chokidar.watch(paths.outputs, {
      depth: WATCH_DEPTH,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    activeWatcher.on('add', fire).on('unlink', fire);
    return true;
  });

  ipcMain.handle(IPC.fs.readPngInfo, async (_e, path: string) => readPngInfo(path));

  ipcMain.handle(IPC.fs.showItemInFolder, (_e, path: string) => {
    shell.showItemInFolder(path);
  });

  win.on('closed', () => {
    void activeWatcher?.close();
    activeWatcher = null;
  });
}

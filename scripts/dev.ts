import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const mainEntry = resolve(root, 'dist/main/index.js');

async function runOnce(cmd: string, args: string[]): Promise<void> {
  const proc = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const [code] = (await once(proc, 'exit')) as [number | null];
  if (code !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${code ?? 'null'}`);
  }
}

console.log('compiling main process (one-shot)…');
await runOnce('npx', ['tsc', '-p', 'tsconfig.node.json']);
if (!existsSync(mainEntry)) {
  console.error(`main entry missing after compile: ${mainEntry}`);
  process.exit(1);
}

// ELECTRON_RUN_AS_NODE forces the electron binary to run as plain Node, which
// skips main-process bootstrap and makes require('electron') return the binary
// path instead of the API. Strip it from the child env to be safe.
const childEnv = { ...process.env, VITE_DEV_SERVER_URL: '' };
delete childEnv.ELECTRON_RUN_AS_NODE;

const server = await createServer({ configFile: resolve(root, 'vite.config.ts') });
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) {
  console.error('vite did not return a local URL');
  process.exit(1);
}
console.log(`vite ready at ${url}`);

const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.node.json', '--watch', '--preserveWatchOutput'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
tsc.on('exit', (code, signal) => {
  console.warn(`tsc --watch exited (code=${code ?? 'null'} signal=${signal ?? 'null'}); incremental rebuilds are off but Electron stays up`);
});

childEnv.VITE_DEV_SERVER_URL = url;
const electron = spawn('npx', ['electron', '.'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: childEnv,
});

await once(electron, 'exit');
tsc.kill();
await server.close();
process.exit(0);

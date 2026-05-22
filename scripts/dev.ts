import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'vite';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const server = await createServer({ configFile: resolve(root, 'vite.config.ts') });
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) {
  console.error('vite did not return a local URL');
  process.exit(1);
}
console.log(`vite ready at ${url}`);

const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.node.json', '--watch'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

await new Promise((r) => setTimeout(r, 1500));

const electron = spawn('npx', ['electron', '.'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});

await Promise.race([once(electron, 'exit'), once(tsc, 'exit')]);
electron.kill();
tsc.kill();
await server.close();
process.exit(0);

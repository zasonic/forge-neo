import { join } from 'node:path';

export interface InstallPaths {
  root: string;
  runtime: string;
  python: string;
  uvBin: string;
  app: string;
  venv: string;
  venvPython: string;
  outputs: string;
  models: string;
  loras: string;
  vae: string;
  embeddings: string;
  extensions: string;
  ourExtension: string;
  logs: string;
}

export function resolveInstallPaths(root: string): InstallPaths {
  const app = join(root, 'app');
  const venv = join(app, 'venv');
  const runtime = join(root, 'runtime');
  const python = join(runtime, 'python311');
  return {
    root,
    runtime,
    python,
    uvBin: join(runtime, 'bin', 'uv.exe'),
    app,
    venv,
    venvPython: join(venv, 'Scripts', 'python.exe'),
    outputs: join(app, 'outputs'),
    models: join(app, 'models', 'Stable-diffusion'),
    loras: join(app, 'models', 'Lora'),
    vae: join(app, 'models', 'VAE'),
    embeddings: join(app, 'embeddings'),
    extensions: join(app, 'extensions'),
    ourExtension: join(app, 'extensions', 'forge-neo-api'),
    logs: join(root, 'logs'),
  };
}

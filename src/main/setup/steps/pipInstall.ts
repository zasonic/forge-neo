import { resolveBundledBinary } from '../../bundled.js';
import {
  BITSANDBYTES_PIN,
  CLIP_ZIP,
  DEEPSPEED_WHL,
  HFXET_PIN,
  NUNCHAKU_WHL,
  SAGE_WHL,
  TORCH_INDEX,
  TORCH_PINS,
  TRITON_PIN,
  UV_BOOTSTRAP_PINS,
} from '../../../shared/setup/pins.js';
import type { LogLine } from '../../../shared/ipc/contract.js';
import type { InstallPaths } from '../../../shared/paths.js';
import { runCommand } from '../runner.js';

interface PipOpts {
  paths: InstallPaths;
  onLog: (line: LogLine) => void;
  signal: AbortSignal;
}

function uvPipEnv(paths: InstallPaths): NodeJS.ProcessEnv {
  return {
    ...process.env,
    VIRTUAL_ENV: paths.venv,
    UV_PROJECT_ENVIRONMENT: paths.venv,
  };
}

async function uvPipInstall(opts: PipOpts, args: readonly string[]): Promise<void> {
  await runCommand({
    bin: resolveBundledBinary('uv.exe'),
    args: ['pip', 'install', ...args],
    cwd: opts.paths.app,
    env: uvPipEnv(opts.paths),
    onLog: opts.onLog,
    signal: opts.signal,
  });
}

export async function pipBootstrap(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [...UV_BOOTSTRAP_PINS]);
}

export async function pipClip(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [CLIP_ZIP, '--no-build-isolation']);
}

export async function pipTorch(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [
    ...TORCH_PINS,
    '--index-url',
    TORCH_INDEX,
    '--force-reinstall',
    '--no-deps',
  ]);
}

export async function pipDeepspeed(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [DEEPSPEED_WHL]);
}

export async function pipBitsandbytes(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, ['-U', BITSANDBYTES_PIN, '--force-reinstall', '--no-deps']);
}

export async function pipNunchaku(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [NUNCHAKU_WHL]);
}

export async function pipTriton(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [TRITON_PIN]);
}

export async function pipSage(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [SAGE_WHL]);
}

export async function pipHfXet(opts: PipOpts): Promise<void> {
  await uvPipInstall(opts, [HFXET_PIN]);
}

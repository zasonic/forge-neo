/**
 * Single source of truth for every pinned URL the setup wizard consumes.
 *
 * SHA256 fields live as _sha256 siblings where upstream publishes them
 * (DeepSpeed and SageAttention do; the Nunchaku wheel and the CLIP zip
 * don't, so those entries stay unverified — a single warning is logged
 * at install time).
 */

export const PYTHON_VERSION = '3.11';

export const UV_BOOTSTRAP_PINS: readonly string[] = [
  'wheel',
  'setuptools==69.5.1',
  'pip==25.3',
];

export const CLIP_ZIP =
  'https://github.com/openai/CLIP/archive/d50d76daa670286dd6cacf3bcd80b5e4823fc8e1.zip';

export const TORCH_INDEX = 'https://download.pytorch.org/whl/cu128';

export const TORCH_PINS: readonly string[] = [
  'torch==2.7.0',
  'torchvision==0.22.0',
  'torchaudio==2.7.0',
  'xformers==0.0.30',
];

export const DEEPSPEED_WHL =
  'https://github.com/6Morpheus6/deepspeed-windows-wheels/releases/download/v0.17.5/deepspeed-0.17.5+e1560d84-2.7torch+cu128-cp311-cp311-win_amd64.whl';

export const BITSANDBYTES_PIN = 'bitsandbytes';

export const NUNCHAKU_WHL =
  'https://huggingface.co/nunchaku-tech/nunchaku/resolve/main/nunchaku-1.0.2%2Btorch2.7-cp311-cp311-win_amd64.whl';

export const TRITON_PIN = 'triton-windows==3.3.1.post19';

export const SAGE_WHL =
  'https://github.com/woct0rdho/SageAttention/releases/download/v2.2.0-windows.post3/sageattention-2.2.0+cu128torch2.7.1.post3-cp39-abi3-win_amd64.whl';

export const HFXET_PIN = 'hf-xet';

export const UPSTREAM_OWNER = 'Haoming02';
export const UPSTREAM_REPO_NAME = 'sd-webui-forge-classic';
export const UPSTREAM_REF = 'neo';

export function forgeTarballUrl(sha: string): string {
  return `https://codeload.github.com/${UPSTREAM_OWNER}/${UPSTREAM_REPO_NAME}/tar.gz/${sha}`;
}

export function forgeBranchInfoUrl(branch: string = UPSTREAM_REF): string {
  return `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO_NAME}/branches/${branch}`;
}

export const NETWORK_PROBE_TARGETS: readonly string[] = [
  'https://github.com',
  'https://huggingface.co',
  'https://download.pytorch.org',
];

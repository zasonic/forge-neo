export const BACKEND_HOST = '127.0.0.1';
export const DEFAULT_BACKEND_PORT = 7860;
export const BACKEND_PORT_RANGE: [number, number] = [7860, 7899];
export const SUBPATH = 'legacy';

export const UPSTREAM_REPO = 'https://github.com/Haoming02/sd-webui-forge-classic';
export const UPSTREAM_BRANCH = 'neo';
export const UPSTREAM_SHA = '61d327da65b0483cafb74d641f030737db2d6bf1';
export const UPSTREAM_TARBALL_URL = `${UPSTREAM_REPO}/archive/${UPSTREAM_SHA}.tar.gz`;

export const READINESS_PROBE_PATH = '/sdapi/v1/cmd-flags';
export const STDOUT_READY_PATTERN = /Running on local URL/;
export const STARTUP_TIMEOUT_MS = 5 * 60_000;

export const MIN_FREE_GB = 20;
export const MIN_CUDA_DRIVER_VERSION = 550;

export const PYTHON_RELEASE_TAG = '20251114';
export const PYTHON_VERSION = '3.11.14';
export const PYTHON_ARCHIVE_NAME = `cpython-${PYTHON_VERSION}+${PYTHON_RELEASE_TAG}-x86_64-pc-windows-msvc-install_only.tar.gz`;
export const PYTHON_BASE_URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${PYTHON_RELEASE_TAG}`;
export const PYTHON_DOWNLOAD_URL = `${PYTHON_BASE_URL}/${PYTHON_ARCHIVE_NAME}`;
export const PYTHON_SHA256_URL = `${PYTHON_DOWNLOAD_URL}.sha256`;
export const PYTHON_MIRRORS: string[] = [];

export const UV_VERSION = '0.5.11';
export const UV_DOWNLOAD_URL = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-pc-windows-msvc.zip`;

export const STEP_NAMES = [
  'welcome',
  'preflight',
  'python-runtime',
  'uv-bin',
  'venv',
  'repo',
  'torch',
  'extension',
  'smoke-test',
  'model',
  'done',
] as const;
export type StepName = typeof STEP_NAMES[number];

export interface TorchSpec {
  id: string;
  label: string;
  args: string[];
}

const TORCH_INDEX = 'https://download.pytorch.org/whl/cu128';

export const TORCH_INSTALL_SPECS: TorchSpec[] = [
  {
    id: 'torch',
    label: 'torch + torchvision + torchaudio + xformers (cu128)',
    args: [
      'pip', 'install',
      'torch==2.7.0', 'torchvision==0.22.0', 'torchaudio==2.7.0', 'xformers==0.0.30',
      '--index-url', TORCH_INDEX,
      '--force-reinstall', '--no-deps',
    ],
  },
  {
    id: 'deepspeed',
    label: 'deepspeed 0.17.5 (Windows wheel)',
    args: [
      'pip', 'install',
      'https://github.com/6Morpheus6/deepspeed-windows-wheels/releases/download/v0.17.5/deepspeed-0.17.5+e1560d84-2.7torch+cu128-cp311-cp311-win_amd64.whl',
    ],
  },
  {
    id: 'bitsandbytes',
    label: 'bitsandbytes',
    args: ['pip', 'install', '-U', 'bitsandbytes', '--force-reinstall', '--no-deps'],
  },
  {
    id: 'nunchaku',
    label: 'nunchaku 1.0.2 (torch2.7 cp311 Windows)',
    args: [
      'pip', 'install',
      'https://huggingface.co/nunchaku-tech/nunchaku/resolve/main/nunchaku-1.0.2%2Btorch2.7-cp311-cp311-win_amd64.whl',
    ],
  },
  {
    id: 'triton',
    label: 'triton-windows 3.3.1.post19',
    args: ['pip', 'install', 'triton-windows==3.3.1.post19'],
  },
  {
    id: 'sageattention',
    label: 'SageAttention 2.2.0 (cu128 Windows)',
    args: [
      'pip', 'install',
      'https://github.com/woct0rdho/SageAttention/releases/download/v2.2.0-windows.post3/sageattention-2.2.0+cu128torch2.7.1.post3-cp39-abi3-win_amd64.whl',
    ],
  },
];

export const CLIP_ZIP_URL = 'https://github.com/openai/CLIP/archive/d50d76daa670286dd6cacf3bcd80b5e4823fc8e1.zip';
export const BASE_PIP_PINS = ['wheel', 'setuptools==69.5.1', 'pip==25.3'];

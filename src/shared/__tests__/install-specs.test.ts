import { describe, expect, it } from 'vitest';
import {
  BASE_PIP_PINS,
  CLIP_ZIP_URL,
  PYTHON_DOWNLOAD_URL,
  PYTHON_SHA256_URL,
  PYTHON_VERSION,
  STEP_NAMES,
  TORCH_INSTALL_SPECS,
  UPSTREAM_BRANCH,
  UPSTREAM_REPO,
  UPSTREAM_SHA,
  UPSTREAM_TARBALL_URL,
  UV_DOWNLOAD_URL,
  UV_VERSION,
} from '../constants.js';

const wheelArgRe = /^https?:\/\//;

function extractUrls(spec: { args: string[] }): string[] {
  return spec.args.filter((a) => wheelArgRe.test(a));
}

describe('install specs — URL shape regressions', () => {
  it('every wheel argument across TORCH_INSTALL_SPECS is an https URL', () => {
    for (const spec of TORCH_INSTALL_SPECS) {
      for (const u of extractUrls(spec)) {
        const url = new URL(u);
        expect(url.protocol).toBe('https:');
      }
    }
  });

  it('nunchaku wheel keeps %2B encoded in the path (uv must not double-encode)', () => {
    const nunchaku = TORCH_INSTALL_SPECS.find((s) => s.id === 'nunchaku');
    expect(nunchaku).toBeDefined();
    const url = extractUrls(nunchaku!)[0];
    expect(url).toBeDefined();
    const parsed = new URL(url!);
    expect(parsed.pathname).toContain('%2B');
    expect(parsed.pathname).not.toContain('+');
  });

  it('deepspeed wheel uses an unencoded + in the path', () => {
    const ds = TORCH_INSTALL_SPECS.find((s) => s.id === 'deepspeed');
    expect(ds).toBeDefined();
    const url = extractUrls(ds!)[0];
    expect(url).toBeDefined();
    expect(new URL(url!).pathname).toContain('+');
  });

  it('sageattention wheel uses an unencoded + in the path', () => {
    const sage = TORCH_INSTALL_SPECS.find((s) => s.id === 'sageattention');
    expect(sage).toBeDefined();
    const url = extractUrls(sage!)[0];
    expect(url).toBeDefined();
    expect(new URL(url!).pathname).toContain('+');
  });

  it('torch spec pins the specific Cuda 12.8 wheel index', () => {
    const torch = TORCH_INSTALL_SPECS.find((s) => s.id === 'torch');
    expect(torch).toBeDefined();
    const args = torch!.args;
    expect(args).toContain('torch==2.7.0');
    expect(args).toContain('torchvision==0.22.0');
    expect(args).toContain('torchaudio==2.7.0');
    expect(args).toContain('xformers==0.0.30');
    expect(args).toContain('--index-url');
    expect(args).toContain('https://download.pytorch.org/whl/cu128');
    expect(args).toContain('--force-reinstall');
    expect(args).toContain('--no-deps');
  });

  it('every torch spec starts with "pip" "install"', () => {
    for (const spec of TORCH_INSTALL_SPECS) {
      expect(spec.args[0]).toBe('pip');
      expect(spec.args[1]).toBe('install');
    }
  });

  it('triton spec pins the Windows wheel', () => {
    const triton = TORCH_INSTALL_SPECS.find((s) => s.id === 'triton');
    expect(triton).toBeDefined();
    expect(triton!.args).toContain('triton-windows==3.3.1.post19');
  });

  it('CLIP zip URL targets the openai/CLIP archive', () => {
    const u = new URL(CLIP_ZIP_URL);
    expect(u.hostname).toBe('github.com');
    expect(u.pathname).toContain('/openai/CLIP/archive/');
    expect(u.pathname.endsWith('.zip')).toBe(true);
  });

  it('base pip pins are well-formed', () => {
    expect(BASE_PIP_PINS).toContain('wheel');
    expect(BASE_PIP_PINS.some((p) => p.startsWith('setuptools=='))).toBe(true);
    expect(BASE_PIP_PINS.some((p) => p.startsWith('pip=='))).toBe(true);
  });
});

describe('install specs — Python + uv pinning', () => {
  it('PYTHON_DOWNLOAD_URL is an https URL ending in .tar.gz', () => {
    const url = new URL(PYTHON_DOWNLOAD_URL);
    expect(url.protocol).toBe('https:');
    expect(url.pathname.endsWith('.tar.gz')).toBe(true);
  });

  it('PYTHON_SHA256_URL is PYTHON_DOWNLOAD_URL + .sha256', () => {
    expect(PYTHON_SHA256_URL).toBe(`${PYTHON_DOWNLOAD_URL}.sha256`);
  });

  it('PYTHON_VERSION is a 3.11.x pin', () => {
    expect(PYTHON_VERSION.startsWith('3.11.')).toBe(true);
  });

  it('UV_DOWNLOAD_URL targets the pinned UV_VERSION on astral-sh/uv', () => {
    const url = new URL(UV_DOWNLOAD_URL);
    expect(url.hostname).toBe('github.com');
    expect(url.pathname).toContain('/astral-sh/uv/');
    expect(url.pathname).toContain(UV_VERSION);
    expect(url.pathname.endsWith('.zip')).toBe(true);
  });
});

describe('install specs — upstream Forge pinning', () => {
  it('UPSTREAM_TARBALL_URL embeds UPSTREAM_REPO and UPSTREAM_SHA', () => {
    expect(UPSTREAM_TARBALL_URL.startsWith(UPSTREAM_REPO)).toBe(true);
    expect(UPSTREAM_TARBALL_URL).toContain(UPSTREAM_SHA);
    expect(UPSTREAM_TARBALL_URL.endsWith('.tar.gz')).toBe(true);
  });

  it('UPSTREAM_SHA looks like a 40-char git SHA', () => {
    expect(UPSTREAM_SHA).toMatch(/^[0-9a-f]{40}$/);
  });

  it('UPSTREAM_BRANCH is set', () => {
    expect(UPSTREAM_BRANCH.length).toBeGreaterThan(0);
  });
});

describe('install specs — step order invariants', () => {
  it('STEP_NAMES has both bookends and the install body', () => {
    expect(STEP_NAMES[0]).toBe('welcome');
    expect(STEP_NAMES[STEP_NAMES.length - 1]).toBe('done');
    for (const required of [
      'preflight',
      'python-runtime',
      'uv-bin',
      'venv',
      'repo',
      'torch',
      'extension',
      'smoke-test',
    ] as const) {
      expect(STEP_NAMES).toContain(required);
    }
  });

  it('uv-bin precedes venv (venv needs the binary)', () => {
    const uv = STEP_NAMES.indexOf('uv-bin');
    const venv = STEP_NAMES.indexOf('venv');
    expect(uv).toBeGreaterThanOrEqual(0);
    expect(uv).toBeLessThan(venv);
  });

  it('torch precedes smoke-test (smoke-test boots Forge which needs torch)', () => {
    const torch = STEP_NAMES.indexOf('torch');
    const smoke = STEP_NAMES.indexOf('smoke-test');
    expect(torch).toBeLessThan(smoke);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CLIP_ZIP,
  DEEPSPEED_WHL,
  NUNCHAKU_WHL,
  SAGE_WHL,
  TORCH_INDEX,
  TORCH_PINS,
  forgeBranchInfoUrl,
  forgeTarballUrl,
} from '../pins.js';

describe('pins — URL shape regressions', () => {
  it('every wheel URL parses as https', () => {
    for (const u of [CLIP_ZIP, DEEPSPEED_WHL, NUNCHAKU_WHL, SAGE_WHL]) {
      const url = new URL(u);
      expect(url.protocol).toBe('https:');
    }
  });

  it('nunchaku wheel keeps %2B encoded in the path (uv must not double-encode)', () => {
    const url = new URL(NUNCHAKU_WHL);
    // The literal '+' in nunchaku-1.0.2+torch2.7 must remain percent-encoded
    // in the URL so a downstream HTTP client doesn't interpret it as space.
    expect(url.pathname).toContain('%2B');
    expect(url.pathname).not.toContain('+');
  });

  it('deepspeed wheel uses an unencoded + in the path', () => {
    // GitHub release URLs accept raw '+'; this is a deliberate difference
    // from the HuggingFace-hosted nunchaku wheel.
    const url = new URL(DEEPSPEED_WHL);
    expect(url.pathname).toContain('+');
  });

  it('sage wheel uses an unencoded + in the path', () => {
    const url = new URL(SAGE_WHL);
    expect(url.pathname).toContain('+');
  });

  it('torch pins include xformers and pin specific versions', () => {
    expect(TORCH_PINS).toContain('torch==2.7.0');
    expect(TORCH_PINS).toContain('torchvision==0.22.0');
    expect(TORCH_PINS).toContain('xformers==0.0.30');
  });

  it('torch index is the CUDA 12.8 download endpoint', () => {
    expect(TORCH_INDEX).toBe('https://download.pytorch.org/whl/cu128');
  });

  it('forgeTarballUrl interpolates a SHA into codeload', () => {
    const sha = '0123456789abcdef';
    const url = forgeTarballUrl(sha);
    expect(url).toBe(`https://codeload.github.com/Haoming02/sd-webui-forge-classic/tar.gz/${sha}`);
  });

  it('forgeBranchInfoUrl targets the GitHub branches API', () => {
    expect(forgeBranchInfoUrl('neo')).toBe(
      'https://api.github.com/repos/Haoming02/sd-webui-forge-classic/branches/neo',
    );
  });
});

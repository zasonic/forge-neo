import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveForgeImgRequest } from '../forge-img-resolve.js';
import { resolveInstallPaths } from '../../../shared/paths.js';

const INSTALL_ROOT = path.resolve('/tmp/forge-neo-test-root');
const paths = resolveInstallPaths(INSTALL_ROOT);

describe('resolveForgeImgRequest — allowed cases', () => {
  it('resolves a file under outputs', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/foo.png', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.outputs, 'foo.png'));
  });

  it('resolves nested paths under outputs', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/sub/dir/img.png', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.outputs, 'sub', 'dir', 'img.png'));
  });

  it('resolves a file under models', () => {
    const r = resolveForgeImgRequest('forge-img://models/checkpoint.safetensors', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.models, 'checkpoint.safetensors'));
  });

  it('resolves a file under loras', () => {
    const r = resolveForgeImgRequest('forge-img://loras/style.safetensors', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.loras, 'style.safetensors'));
  });

  it('allows root itself (empty path)', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(paths.outputs);
  });

  it('decodes percent-encoded path segments', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/has%20space.png', INSTALL_ROOT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.outputs, 'has space.png'));
  });
});

describe('resolveForgeImgRequest — traversal rejection', () => {
  it('rejects encoded-slash traversal that escapes root', () => {
    // %2f preserves the slash through URL parsing so .. is hidden from the
    // WHATWG dot-segment normalizer; the resolver must catch it.
    const r = resolveForgeImgRequest(
      'forge-img://outputs/..%2f..%2fetc/passwd',
      INSTALL_ROOT,
    );
    expect(r).toEqual({ ok: false, status: 403 });
  });

  it('rejects a single encoded-slash + dotdot segment', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/..%2fmodels/secret', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 403 });
  });

  it('rejects backslash segments (Windows separator injection)', () => {
    const r = resolveForgeImgRequest(
      'forge-img://outputs/foo%5c..%5c..%5cetc%5cpasswd',
      INSTALL_ROOT,
    );
    expect(r).toEqual({ ok: false, status: 403 });
  });

  it('rejects an embedded NUL byte', () => {
    const r = resolveForgeImgRequest('forge-img://outputs/foo%00.png', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 403 });
  });
});

describe('resolveForgeImgRequest — URL parser normalisation', () => {
  it('plain ../ segments are collapsed by URL parser and resolve under root', () => {
    // forge-img://outputs/../../../etc/passwd → URL parser strips .. before
    // we see it; pathname becomes /etc/passwd. This is safe.
    const r = resolveForgeImgRequest(
      'forge-img://outputs/../../../etc/passwd',
      INSTALL_ROOT,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.outputs, 'etc', 'passwd'));
  });

  it('percent-encoded %2e%2e is also collapsed by URL parser', () => {
    const r = resolveForgeImgRequest(
      'forge-img://outputs/%2e%2e/%2e%2e/etc/passwd',
      INSTALL_ROOT,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absPath).toBe(path.join(paths.outputs, 'etc', 'passwd'));
  });
});

describe('resolveForgeImgRequest — unknown roots', () => {
  it('rejects an unknown root key', () => {
    const r = resolveForgeImgRequest('forge-img://secrets/file.txt', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 403 });
  });

  it('rejects an empty host', () => {
    const r = resolveForgeImgRequest('forge-img:///foo.png', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 403 });
  });

  it('rejects a sibling-prefix host (outputs2 is not a registered root)', () => {
    const r = resolveForgeImgRequest('forge-img://outputs2/foo.png', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 403 });
  });
});

describe('resolveForgeImgRequest — malformed input', () => {
  it('rejects a non-URL string', () => {
    const r = resolveForgeImgRequest('not a url at all', INSTALL_ROOT);
    expect(r).toEqual({ ok: false, status: 400 });
  });
});

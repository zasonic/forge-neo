import path from 'node:path';
import { resolveInstallPaths } from '../../shared/paths.js';

export type ForgeImgRoot = 'outputs' | 'models' | 'loras';

export type ForgeImgResolveResult =
  | { ok: true; absPath: string }
  | { ok: false; status: number };

export function resolveForgeImgRequest(
  rawUrl: string,
  installRoot: string,
): ForgeImgResolveResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, status: 400 };
  }
  const paths = resolveInstallPaths(installRoot);
  const roots: Record<string, string> = {
    outputs: paths.outputs,
    models: paths.models,
    loras: paths.loras,
  };
  const rootPath = roots[url.host];
  if (!rootPath) return { ok: false, status: 403 };

  const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const segments = rel.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') return { ok: false, status: 403 };
    if (seg.includes('\\')) return { ok: false, status: 403 };
    if (seg.includes('\0')) return { ok: false, status: 403 };
  }
  const resolved = path.resolve(rootPath, ...segments);
  if (resolved !== rootPath && !resolved.startsWith(rootPath + path.sep)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, absPath: resolved };
}

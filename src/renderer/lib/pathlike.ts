/**
 * Tiny path helpers that work on Windows-style backslashes and POSIX
 * forward slashes alike. Renderer can't import `node:path`.
 */
export function basename(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

export function dirname(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? '' : norm.slice(0, idx);
}

export function pathToForgeImg(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/').map(encodeURIComponent);
  return `forge-img:///${parts.join('/')}`;
}

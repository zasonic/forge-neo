export type ForgeImgRoot = 'outputs' | 'models' | 'loras';

export function pathToForgeImg(relPath: string, root: ForgeImgRoot = 'outputs'): string {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean).map(encodeURIComponent);
  return `forge-img://${root}/${parts.join('/')}`;
}

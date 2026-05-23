/**
 * Build a `forge-img://` URL that the main-process protocol handler resolves
 * to an absolute on-disk file. The path is passed as a `?path=` query
 * parameter so URL normalization can't strip leading slashes (which would
 * otherwise break absolute paths on both Linux and Windows). The handler
 * still enforces an allow-list of roots (outputs/, models/, loras/).
 */
export function fileUrl(absPath: string): string {
  const norm = absPath.replace(/\\/g, '/');
  return `forge-img:///?path=${encodeURIComponent(norm)}`;
}

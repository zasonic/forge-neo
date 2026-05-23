import { protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';
import { resolveInstallPaths } from '../../shared/paths.js';
import { settingsStore } from '../config/store.js';

export const FORGE_IMG_SCHEME = 'forge-img';

export function registerForgeImgProtocol(): void {
  protocol.handle(FORGE_IMG_SCHEME, (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const paths = resolveInstallPaths(settingsStore.get('installRoot'));
    const allowedRoots = [paths.outputs, paths.models, paths.loras];
    const target = rel.startsWith('/') ? rel : `${paths.outputs}/${rel}`;
    const normalized = target.replace(/\\/g, '/');
    const allowed = allowedRoots.some((root) =>
      normalized.startsWith(root.replace(/\\/g, '/')),
    );
    if (!allowed) {
      return new Response('forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

export function registerForgeImgPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: FORGE_IMG_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

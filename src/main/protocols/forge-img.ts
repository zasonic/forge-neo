import { protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';
import { settingsStore } from '../config/store.js';
import { resolveForgeImgRequest } from './forge-img-resolve.js';

export const FORGE_IMG_SCHEME = 'forge-img';

export type { ForgeImgRoot } from './forge-img-resolve.js';

export function registerForgeImgProtocol(): void {
  protocol.handle(FORGE_IMG_SCHEME, (request) => {
    const result = resolveForgeImgRequest(request.url, settingsStore.get('installRoot'));
    if (!result.ok) {
      return new Response('forbidden', { status: result.status });
    }
    return net.fetch(pathToFileURL(result.absPath).toString());
  });
}

export function registerForgeImgPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: FORGE_IMG_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

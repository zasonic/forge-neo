export const BACKEND_HOST = '127.0.0.1';
export const DEFAULT_BACKEND_PORT = 7860;
export const BACKEND_PORT_RANGE: [number, number] = [7860, 7899];
export const SUBPATH = 'legacy';

export const UPSTREAM_REPO = 'https://github.com/Haoming02/sd-webui-forge-classic';
export const UPSTREAM_BRANCH = 'neo';
export const UPSTREAM_SHA = '61d327da65b0483cafb74d641f030737db2d6bf1';

export const READINESS_PROBE_PATH = '/sdapi/v1/cmd-flags';
export const STDOUT_READY_PATTERN = /Running on local URL/;
export const STARTUP_TIMEOUT_MS = 5 * 60_000;

export const MIN_FREE_GB = 20;
export const MIN_CUDA_DRIVER_VERSION = 550;

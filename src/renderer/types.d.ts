import type { ForgeBridge } from '../preload/index.mjs';

declare global {
  interface Window {
    forge: ForgeBridge;
  }
}

export {};

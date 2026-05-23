import type { ForgeBridge } from '../preload/index.js';

declare global {
  interface Window {
    forge: ForgeBridge;
  }
}

export {};

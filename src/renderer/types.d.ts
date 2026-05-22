import type { ForgeBridge } from '../preload/index.js';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  interface Window {
    forge: ForgeBridge;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        preload?: string;
        nodeintegration?: boolean | '';
        allowpopups?: boolean | '';
        useragent?: string;
      };
    }
  }
}

export {};

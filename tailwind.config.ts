import type { Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0c0f',
          subtle: '#13151a',
          panel: '#1a1d24',
        },
        border: {
          DEFAULT: '#2a2e38',
        },
        accent: {
          DEFAULT: '#7c5cff',
          fg: '#ffffff',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

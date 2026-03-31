import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f1a',
          card: '#1a1a2e',
          accent: '#16213e',
          border: '#2a2a4a',
        },
        neon: {
          cyan: '#00d4ff',
          pink: '#ff006e',
          green: '#00ff88',
          yellow: '#ffbe0b',
        },
      },
      fontFamily: {
        game: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Minimal, professional palette. Ink on paper with a single restrained accent.
        ink: {
          DEFAULT: '#0b0b0f',
          soft: '#3a3a42',
          faint: '#6b6b74',
        },
        paper: {
          DEFAULT: '#ffffff',
          soft: '#f6f6f4',
          sunk: '#eeeeeb',
        },
        line: '#e4e4e0',
        accent: {
          DEFAULT: '#2f6f5b',
          soft: '#e7f0ec',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '44rem',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;

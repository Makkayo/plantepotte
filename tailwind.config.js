/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d12',
          subtle: '#11141c',
        },
        surface: {
          DEFAULT: '#171b26',
          raised: '#1f2433',
          hover: '#262b3d',
        },
        border: {
          DEFAULT: '#2a3045',
          strong: '#3b4264',
        },
        text: {
          DEFAULT: '#e6e9f2',
          muted: '#8891a8',
          dim: '#5a6376',
        },
        leaf: {
          DEFAULT: '#4ade80',
          dim: '#166534',
          glow: '#86efac',
        },
        sun: '#fbbf24',
        sky: '#60a5fa',
        rose: '#f87171',
        violet: '#a78bfa',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

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
          deep: '#0c2a1a',
          glow: '#86efac',
        },
        sun: '#fbbf24',
        sky: '#60a5fa',
        rose: '#f87171',
        violet: '#a78bfa',
        soil: '#b08968',
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-leaf': '0 0 0 1px rgba(74,222,128,0.15), 0 8px 40px -8px rgba(74,222,128,0.25)',
        'glow-soft': '0 18px 50px -20px rgba(0,0,0,0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'rise-in': 'riseIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        breathe: 'breathe 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.95' },
        },
      },
    },
  },
  plugins: [],
};

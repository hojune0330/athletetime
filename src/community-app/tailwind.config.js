/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'
import colors from 'tailwindcss/colors'
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: colors.slate,
        brand: {
          50: '#f5f8ff',
          100: '#e8efff',
          200: '#d3e1ff',
          300: '#adc7ff',
          400: '#7ea5ff',
          500: '#4f82ff',
          600: '#2e67f1',
          700: '#1d4fd4',
          800: '#1a3fa9',
          900: '#173785',
        },
        ink: {
          50: '#f8fafc',
          100: '#eef2f7',
          200: '#d7dde7',
          300: '#b6c2d4',
          400: '#8da1b8',
          500: '#60748c',
          600: '#4b5c70',
          700: '#3d4b5b',
          800: '#2c3740',
          900: '#1d242c',
        },
        beta: '#ff4d57',
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', '"Noto Sans KR"', ...defaultTheme.fontFamily.sans],
        display: ['"Noto Sans KR"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
        subtle: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [forms, typography],
}


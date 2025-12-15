/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Light mode only - 다크모드 제거
  theme: {
    extend: {
      colors: {
        // =============================================
        // Design System v2 - Primary: Indigo
        // =============================================
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',  // 메인 브랜드 컬러
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // =============================================
        // Design System v2 - Accent: Orange (러닝/에너지)
        // =============================================
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // 메인 액센트
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // =============================================
        // Neutral Palette (Light Mode)
        // =============================================
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // =============================================
        // Semantic Colors
        // =============================================
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // =============================================
        // 육상 특화 색상 (포인트)
        // =============================================
        track: {
          red: '#ef4444',     // 트랙 레드
          orange: '#f97316',  // 주황 (하이라이트)
          green: '#10b981',   // 필드 그린
          yellow: '#fbbf24',  // 노란색 (금메달)
          silver: '#94a3b8',  // 은메달
          bronze: '#a16207',  // 동메달
        },
        // =============================================
        // 종목별 색상
        // =============================================
        event: {
          sprint: '#ef4444',     // 단거리 - 빨강
          middle: '#f97316',     // 중거리 - 주황
          distance: '#6366f1',   // 장거리 - 인디고 (변경)
          hurdles: '#8b5cf6',    // 허들 - 보라
          field: '#10b981',      // 필드 - 초록
          throws: '#6366f1',     // 투척 - 인디고
        }
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          'Segoe UI', 
          'Malgun Gothic', 
          '맑은 고딕', 
          'sans-serif'
        ],
        mono: ['SF Mono', 'Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-accent': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
        'fadeInUp': 'fadeInUp 0.4s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Athlete Time 블루 테마 - 가독성 높은 밝은 블루
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa', // 밝은 블루 (텍스트용)
          500: '#3b82f6', // 메인 블루
          600: '#2563eb', // 진한 블루
          700: '#1d4ed8', // 더 진한 블루
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 다크 모드 색상 - 가독성 개선
        dark: {
          50: '#4a4a4a',
          100: '#3a3a3a',
          200: '#2d2d2d',
          300: '#262626',
          400: '#1f1f1f',
          500: '#1a1a1a', // 보더
          600: '#242424', // 카드 배경 (약간 밝게)
          700: '#1a1a1a', // 메인 컨텐츠 배경
          800: '#111111', // 페이지 배경
          900: '#0a0a0a', // 가장 어두운
        },
        // 육상 트랙 색상 (포인트)
        track: {
          red: '#ef4444',    // 트랙 레드
          blue: '#3b82f6',   // 트랙 블루  
          green: '#10b981',  // 필드 그린
          orange: '#f97316', // 주황 (경고/하이라이트)
          yellow: '#fbbf24', // 노란색 (금메달)
          silver: '#94a3b8', // 은메달
          bronze: '#a16207', // 동메달
        },
        // 종목별 색상
        event: {
          sprint: '#ef4444',     // 단거리 - 빨강
          middle: '#f97316',     // 중거리 - 주황
          distance: '#3b82f6',   // 장거리 - 파랑
          hurdles: '#8b5cf6',    // 허들 - 보라
          field: '#10b981',      // 필드 - 초록
          throws: '#6366f1',     // 투척 - 남색
        }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.12)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [],
}
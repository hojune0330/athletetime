# 익명게시판 디자인 개선 기획서

## 개요
**작성일**: 2025-11-26  
**기반**: Athlete Time Design System v2 (Option D: Hybrid Modern)  
**목표**: 다크모드 → 라이트모드 전환, 일관된 디자인 시스템 적용, 모바일 UX 대폭 개선

---

## 1. 현재 상태 분석

### 1.1 기술 스택
- **프레임워크**: React + TypeScript + Vite
- **스타일링**: Tailwind CSS (커스텀 설정)
- **상태관리**: TanStack Query (React Query)
- **라우팅**: React Router DOM

### 1.2 현재 디자인 문제점

#### 컬러 시스템
| 항목 | 현재 | 문제점 |
|------|------|--------|
| 모드 | 다크모드 전용 (`#0a0a0a`, `#111111`) | 메인 페이지 라이트모드와 불일치 |
| Primary | Blue (`#3b82f6`) | Design System v2의 Indigo와 불일치 |
| Accent | Red (`#ef4444`) | Orange 액센트와 불일치 |
| 배경 | `dark-600`, `dark-700`, `dark-800` | 전체 앱 통일성 저하 |

#### UI/UX 문제점
1. **시각적 불일치**: 메인 페이지(라이트모드)와 커뮤니티(다크모드) 전환 시 사용자 혼란
2. **모바일 메뉴**: 하단 고정 메뉴가 화면을 가림, 제스처 친화적이지 않음
3. **카드 디자인**: 평면적, 시각적 계층 부족
4. **애니메이션**: 기본적인 fadeIn만 존재, 인터랙션 부족
5. **접근성**: 다크모드 대비율 불충분, 포커스 상태 미흡

### 1.3 컴포넌트 구조
```
src/
├── components/
│   ├── common/          # Pagination 등
│   ├── layout/          # Header, Sidebar, Footer, Layout
│   └── post/            # PostList, PostItem
├── pages/               # HomePage, PostDetailPage, WritePage 등
├── context/             # AuthContext
├── hooks/               # usePosts 등
└── types/               # TypeScript 타입
```

---

## 2. 디자인 개선 방향

### 2.1 핵심 원칙
1. **일관성**: Design System v2와 완전한 통일
2. **라이트모드**: 다크모드 완전 제거, 라이트모드 전용
3. **모바일 우선**: 터치 친화적 UI, 44px 최소 터치 타겟
4. **접근성**: WCAG AA 준수, 명확한 시각적 피드백

### 2.2 컬러 시스템 전환

#### Before (Dark Mode)
```css
--bg-primary: #0a0a0a;
--bg-card: #242424;
--text-primary: #f3f4f6;
--primary-blue: #3b82f6;
```

#### After (Light Mode - Design System v2)
```css
/* Primary: Indigo */
--color-primary-500: #6366f1;
--color-primary-600: #4f46e5;

/* Accent: Orange */
--color-accent-500: #f97316;

/* Backgrounds */
--color-bg-primary: #f8fafc;
--color-bg-card: #ffffff;

/* Text */
--color-text-primary: #0f172a;
--color-text-secondary: #475569;
```

### 2.3 타이포그래피 통일
| 용도 | 크기 | 굵기 |
|------|------|------|
| Page Title | 24px (text-2xl) | 800 (extrabold) |
| Section Title | 20px (text-xl) | 700 (bold) |
| Card Title | 18px (text-lg) | 600 (semibold) |
| Body | 16px (text-base) | 400 (normal) |
| Caption | 14px (text-sm) | 400 (normal) |
| Small | 12px (text-xs) | 500 (medium) |

---

## 3. 컴포넌트별 개선 계획

### 3.1 Layout.tsx
```
변경 전:
- bg-dark-800 배경
- 3단 레이아웃 (Sidebar + Main + RightBanner)

변경 후:
- bg-neutral-50 배경 (--color-bg-primary)
- 반응형 레이아웃 최적화
- 헤더 sticky 유지
```

### 3.2 Header.tsx
```
변경 전:
- bg-gradient-to-r from-primary-600 to-primary-700 (Blue)
- 다크 텍스트

변경 후:
- bg-gradient-to-r from-primary-500 to-primary-600 (Indigo)
- 밝은 배경과 조화
- 모바일 햄버거 메뉴 개선
- 검색 기능 강화
```

### 3.3 HomePage.tsx
```
변경 전:
- bg-dark-700 카드
- 다크 입력 필드

변경 후:
- bg-white 카드 (shadow-md)
- 밝은 입력 필드 (border focus:ring)
- 정렬 버튼 pill 스타일
- 빠른 글쓰기 폼 개선
```

### 3.4 PostList.tsx
```
변경 전:
- 평면적 리스트
- 기본 hover 효과

변경 후:
- 카드 기반 리스트 (subtle shadow)
- Hover: 좌측 accent border 표시
- Stagger 애니메이션
- 스켈레톤 로딩 개선
```

### 3.5 Sidebar.tsx
```
변경 전:
- bg-dark-700 배경
- 다크 메뉴 아이템

변경 후:
- bg-white 배경
- 활성 메뉴: bg-primary-50 + text-primary-600 + border-l-4
- 호버: bg-neutral-100
- 프로필 섹션 개선
```

### 3.6 모바일 네비게이션 개선
```
변경 전:
- 하단 전체 화면 오버레이
- 닫기 버튼 필요

변경 후:
- 슬라이드 인 드로어 (우측)
- 스와이프로 닫기
- Safe Area 지원
- 햄버거 ↔ X 아이콘 전환
```

---

## 4. 상세 구현 계획

### Phase 1: 기본 컬러/스타일 변환 (필수)
- [ ] tailwind.config.js 수정 (라이트모드 팔레트)
- [ ] index.css 전면 수정
- [ ] App.tsx 다크모드 강제 적용 제거
- [ ] Layout.tsx 배경색 변경

### Phase 2: 핵심 컴포넌트 개선
- [ ] Header.tsx 라이트모드 적용
- [ ] Sidebar.tsx 라이트모드 적용
- [ ] HomePage.tsx 카드/폼 스타일 개선
- [ ] PostList.tsx 리스트 아이템 개선

### Phase 3: 페이지별 적용
- [ ] PostDetailPage.tsx 개선
- [ ] WritePage.tsx 개선
- [ ] LoginPage.tsx / RegisterPage.tsx 개선
- [ ] NotFoundPage.tsx 개선

### Phase 4: 모바일 UX 최적화
- [ ] 모바일 메뉴 드로어 구현
- [ ] 터치 타겟 44px 확보
- [ ] Safe Area 대응
- [ ] 스와이프 제스처

### Phase 5: 애니메이션 & 인터랙션
- [ ] 페이지 전환 애니메이션
- [ ] 카드 호버 효과
- [ ] 버튼 피드백
- [ ] 스켈레톤 로딩 개선

---

## 5. Tailwind Config 수정안

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // darkMode 제거 (라이트모드 전용)
  theme: {
    extend: {
      colors: {
        // Design System v2 Primary: Indigo
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Design System v2 Accent: Orange
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Neutral (Light Mode)
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
        // Semantic
        success: { 500: '#10b981', 600: '#059669' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 500: '#ef4444', 600: '#dc2626' },
        info: { 500: '#3b82f6', 600: '#2563eb' },
      },
      // ... 기타 설정
    },
  },
  plugins: [],
}
```

---

## 6. CSS 변수 적용 (index.css)

```css
@layer base {
  :root {
    /* Design System v2 - Light Mode */
    --color-bg-primary: #f8fafc;
    --color-bg-secondary: #ffffff;
    --color-bg-card: #ffffff;
    --color-text-primary: #0f172a;
    --color-text-secondary: #475569;
    --color-text-tertiary: #94a3b8;
    --color-border-default: #e2e8f0;
    --color-border-strong: #cbd5e1;
    
    /* Primary: Indigo */
    --color-primary-500: #6366f1;
    --color-primary-600: #4f46e5;
    
    /* Accent: Orange */
    --color-accent-500: #f97316;
  }
  
  body {
    @apply antialiased bg-neutral-50 text-neutral-900;
  }
}
```

---

## 7. 예상 결과

### Before (Dark Mode)
- 어두운 배경 (#0a0a0a ~ #242424)
- Blue Primary (#3b82f6)
- 메인 페이지와 시각적 단절

### After (Light Mode)
- 밝은 배경 (#f8fafc ~ #ffffff)
- Indigo Primary (#6366f1) + Orange Accent (#f97316)
- 메인 페이지와 완벽한 일관성
- 현대적이고 깔끔한 UI
- 향상된 가독성과 접근성

---

## 8. 체크리스트

### 필수 항목
- [ ] 다크모드 코드 완전 제거
- [ ] 모든 `dark-*` 클래스를 라이트모드로 변환
- [ ] Primary 컬러 Blue → Indigo
- [ ] 모바일 메뉴 개선
- [ ] 모든 터치 타겟 44px 이상

### 품질 체크
- [ ] 메인 페이지와 시각적 일관성 확인
- [ ] 모바일 환경 테스트
- [ ] 접근성 검증 (대비율)
- [ ] 성능 테스트 (번들 크기)

---

## 9. 참고 자료

- **Design System v2**: `/home/user/webapp/design-system-v2.css`
- **메인 페이지**: `/home/user/webapp/index.html`
- **기존 기획서**: `/home/user/webapp/DESIGN_IMPROVEMENT_PLAN.md`

---

**작성**: AI Design Agent  
**승인 대기**: 사용자 검토 후 구현 진행

# 🎨 Athlete Time 페이스 계산기 디자인 개선 기획서

**작성일:** 2025-11-26  
**버전:** 1.0  
**대상:** pace-calculator.html, design-system.css, 전체 UI/UX

---

## 📋 목차

1. [현황 분석](#1-현황-분석)
2. [경쟁 서비스 벤치마킹](#2-경쟁-서비스-벤치마킹)
3. [2025 UI/UX 트렌드 분석](#3-2025-uiux-트렌드-분석)
4. [디자인 개선 방향 (5가지 옵션)](#4-디자인-개선-방향-5가지-옵션)
5. [컬러 스킴 개선안](#5-컬러-스킴-개선안)
6. [타이포그래피 개선안](#6-타이포그래피-개선안)
7. [컴포넌트 디자인 개선안](#7-컴포넌트-디자인-개선안)
8. [모바일 반응형 개선안](#8-모바일-반응형-개선안)
9. [인터랙션/애니메이션 개선안](#9-인터랙션애니메이션-개선안)
10. [접근성 개선안](#10-접근성-개선안)
11. [구현 우선순위 및 로드맵](#11-구현-우선순위-및-로드맵)

---

## 1. 현황 분석

### 1.1 현재 페이스 계산기 구조
```
pace-calculator.html (3037줄)
├── 헤더 (오렌지-레드 그라데이션)
├── 4개의 탭 메뉴
│   ├── 페이스 차트 (KM 페이스별 거리 환산표, 목표 기록별 페이스 분석 등)
│   ├── 트랙 레인 (400m 트랙 레인별 시간 계산기)
│   ├── 목표 페이스 (커스텀 페이스 계산)
│   └── 스플릿 계산 (Even/Negative/Positive)
├── 데이터 테이블 (다수)
├── SVG 트랙 시각화
└── 다운로드/공유 기능 (PNG, PDF, 인쇄)
```

### 1.2 현재 디자인 강점
- ✅ 풍부한 데이터 제공 (KM 페이스, 목표 기록, 레인 보정, 장애물 페이스)
- ✅ 기능적 완성도 높음 (4개 탭, 다양한 계산기)
- ✅ 다운로드/공유 기능 지원
- ✅ Tailwind CSS 활용한 유틸리티 기반 스타일링
- ✅ design-system.css 참조 (CSS 변수 활용 가능)

### 1.3 현재 디자인 문제점
| 카테고리 | 문제점 | 영향도 |
|---------|--------|--------|
| **컬러** | 오렌지-레드 헤더와 보라-파랑 그라데이션 혼재 | 높음 |
| **일관성** | 인라인 스타일과 Tailwind 클래스 혼용 | 중간 |
| **테이블** | 데이터 밀도가 높아 가독성 저하 | 높음 |
| **모바일** | 테이블 스크롤 UX 개선 필요 | 높음 |
| **인터랙션** | 탭 전환 시 애니메이션 부재 | 중간 |
| **접근성** | 일부 aria-label 누락, 색 대비 검증 필요 | 중간 |
| **디자인 시스템** | design-system.css 활용 부족 | 높음 |

### 1.4 현재 design-system.css 상태
```css
/* 이미 정의된 CSS 변수 */
--primary: #667eea;
--primary-dark: #764ba2;
--secondary: #00ffa3;
--accent: #ff6b6b;

/* 정의된 컴포넌트 */
.btn, .btn-primary, .btn-secondary
.card, .card-header, .card-content
.input-field, .input-group
.data-card, .data-grid
```
**문제:** pace-calculator.html이 이 디자인 시스템을 거의 활용하지 않음

---

## 2. 경쟁 서비스 벤치마킹

### 2.1 Strava
| 특징 | 디자인 요소 |
|-----|-----------|
| **컬러** | 오렌지 (#FC4C02) 메인, 다크/화이트 배경 |
| **레이아웃** | 카드 기반 정보 구성, 소셜 피드 스타일 |
| **데이터 시각화** | 그래프, 지도, 세그먼트 시각화 |
| **강점** | 소셜 기능, 세그먼트 경쟁, 데이터 분석 |

### 2.2 Nike Run Club
| 특징 | 디자인 요소 |
|-----|-----------|
| **컬러** | 블랙/화이트 기반, 네온 그린 포인트 |
| **타이포** | 굵고 임팩트 있는 헤드라인 |
| **UI** | 풀스크린 이미지, 대담한 숫자 표시 |
| **강점** | 코치 음성 가이드, 동기부여 디자인 |

### 2.3 Garmin Connect
| 특징 | 디자인 요소 |
|-----|-----------|
| **컬러** | 다크 블루/블랙 기반, 데이터 중심 |
| **UI** | 대시보드 스타일, 위젯 기반 |
| **데이터** | 상세 메트릭, 차트, 히트맵 |
| **강점** | 전문적 데이터 분석, 웨어러블 연동 |

### 2.4 McMillan Running Calculator
| 특징 | 디자인 요소 |
|-----|-----------|
| **컬러** | 깔끔한 화이트 배경, 블루 포인트 |
| **UI** | 단순한 입력 → 결과 흐름 |
| **테이블** | 정돈된 페이스 차트 |
| **강점** | 직관적 UI, VDOT 기반 정확한 계산 |

### 2.5 벤치마킹 인사이트
```
┌─────────────────────────────────────────────────────────────┐
│  Athlete Time이 배워야 할 점                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Strava: 소셜 요소와 성취감 디자인                         │
│  2. Nike Run Club: 대담한 타이포와 동기부여 UX                │
│  3. Garmin Connect: 전문적 데이터 시각화                      │
│  4. McMillan: 깔끔한 입력-결과 플로우                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 2025 UI/UX 트렌드 분석

### 3.1 핵심 트렌드
| 트렌드 | 설명 | 적용 방안 |
|-------|------|----------|
| **미니멀리즘 + 깊이감** | 불필요한 요소 제거, 레이어와 그림자로 깊이 추가 | 카드 기반 UI, 미세한 그림자 |
| **개인화된 컬러** | 사용자/시간대 기반 동적 색상 조정 | 다크모드, 테마 선택 옵션 |
| **마이크로 인터랙션** | 버튼 피드백, 상태 변화 애니메이션 | 탭 전환, 계산 결과 표시 시 |
| **Glassmorphism** | 반투명 + 블러 효과 | 헤더, 모달, 카드 배경 |
| **대담한 타이포** | 큰 숫자, 임팩트 있는 헤드라인 | 페이스 결과 표시 |
| **접근성 우선** | WCAG 준수, 색맹/저시력 고려 | 색 대비, 텍스트 크기 옵션 |

### 3.2 피트니스 앱 특화 트렌드
- **즉각적인 피드백**: 실시간 통계, 진행도 시각화
- **게이미피케이션**: 스트릭, 배지, 레벨 시스템
- **AI 개인화**: 사용 패턴 기반 추천
- **웨어러블 연동**: 데이터 동기화 준비

---

## 4. 디자인 개선 방향 (5가지 옵션)

### 옵션 A: 🏃 "Performance Pro" - 전문가 중심
```
┌─────────────────────────────────────────────────────────────┐
│  콘셉트: Garmin Connect 스타일의 데이터 중심 대시보드         │
├─────────────────────────────────────────────────────────────┤
│  컬러: 다크 블루 (#0f172a) + 네온 그린 (#00ffa3)             │
│  타이포: 모노스페이스 숫자, 간결한 라벨                       │
│  레이아웃: 위젯 기반 그리드, 정보 밀도 유지                   │
│  강점: 전문 선수/코치 타겟, 데이터 분석 최적화                │
│  약점: 초보자에게 복잡할 수 있음                              │
└─────────────────────────────────────────────────────────────┘
```

### 옵션 B: 🌟 "Clean & Simple" - 미니멀 중심
```
┌─────────────────────────────────────────────────────────────┐
│  콘셉트: McMillan 스타일의 깔끔한 입력-결과 플로우             │
├─────────────────────────────────────────────────────────────┤
│  컬러: 화이트 (#ffffff) + 블루 (#667eea)                     │
│  타이포: 큰 숫자 강조, 충분한 여백                            │
│  레이아웃: 단계별 플로우, 결과 카드 하이라이트                 │
│  강점: 직관적, 초보자 친화적                                  │
│  약점: 정보량이 많을 때 스크롤 증가                           │
└─────────────────────────────────────────────────────────────┘
```

### 옵션 C: 🔥 "Energy Boost" - 동기부여 중심
```
┌─────────────────────────────────────────────────────────────┐
│  콘셉트: Nike Run Club 스타일의 대담하고 동기부여적인 디자인   │
├─────────────────────────────────────────────────────────────┤
│  컬러: 블랙 (#111827) + 오렌지-레드 그라데이션                │
│  타이포: 초대형 숫자, 볼드 헤드라인, 응원 메시지               │
│  레이아웃: 풀스크린 섹션, 시각적 임팩트                       │
│  강점: 감정적 연결, 동기부여                                  │
│  약점: 데이터 테이블과 조화 어려움                            │
└─────────────────────────────────────────────────────────────┘
```

### 옵션 D: 🎯 "Hybrid Modern" - 균형 중심 (★ 권장)
```
┌─────────────────────────────────────────────────────────────┐
│  콘셉트: 전문성 + 친근함의 균형, 현대적 미니멀리즘             │
├─────────────────────────────────────────────────────────────┤
│  컬러: 라이트 (#f8fafc) + 인디고 (#667eea) + 오렌지 (#f97316)│
│  타이포: 시스템 폰트 최적화, 숫자 강조                        │
│  레이아웃: 카드 기반 + 컬랩서블 테이블                        │
│  특징:                                                       │
│    - 핵심 정보 우선 표시                                     │
│    - 상세 데이터는 확장 가능                                 │
│    - 다크모드 지원                                           │
│    - 부드러운 애니메이션                                     │
│  강점: 다양한 사용자층 대응, 확장성                           │
│  약점: 구현 복잡도 약간 증가                                  │
└─────────────────────────────────────────────────────────────┘
```

### 옵션 E: 🌙 "Dark Athlete" - 다크모드 중심
```
┌─────────────────────────────────────────────────────────────┐
│  콘셉트: 완전한 다크 테마, 야간/실내 사용 최적화               │
├─────────────────────────────────────────────────────────────┤
│  컬러: 딥 그레이 (#1f2937) + 퍼플 (#8b5cf6) + 사이안 (#06b6d4)│
│  타이포: 높은 가독성, 적절한 밝기                             │
│  레이아웃: 플로팅 카드, 글로우 효과                           │
│  강점: 눈 피로 감소, 트렌디함                                │
│  약점: 일부 사용자 선호도 차이                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 옵션 비교 매트릭스
| 항목 | A (Pro) | B (Simple) | C (Energy) | D (Hybrid) | E (Dark) |
|-----|---------|------------|------------|------------|----------|
| 데이터 친화성 | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ |
| 초보자 친화성 | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| 시각적 임팩트 | ★★★☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| 구현 난이도 | 중간 | 낮음 | 중간 | 중간 | 중간 |
| 확장성 | 높음 | 중간 | 낮음 | 높음 | 높음 |
| **총점** | 15 | 14 | 15 | **17** | 16 |

**권장:** 옵션 D "Hybrid Modern" + 옵션 E 다크모드 토글 지원

---

## 5. 컬러 스킴 개선안

### 5.1 현재 컬러 문제점
```css
/* 현재: 일관성 없는 컬러 사용 */
헤더: orange-500 → red-600 그라데이션
탭: #667eea → #764ba2 그라데이션
차트: blue-50, green-50, yellow-50, purple-50 혼용
```

### 5.2 새로운 컬러 시스템 (옵션 D 기준)

```css
/* 🎨 Primary Palette */
:root {
  /* 메인 브랜드 컬러 - 인디고 계열 */
  --color-primary-50: #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;  /* 메인 */
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  
  /* 액센트 컬러 - 러닝/에너지 (오렌지) */
  --color-accent-50: #fff7ed;
  --color-accent-100: #ffedd5;
  --color-accent-200: #fed7aa;
  --color-accent-300: #fdba74;
  --color-accent-400: #fb923c;
  --color-accent-500: #f97316;  /* 메인 액센트 */
  --color-accent-600: #ea580c;
  --color-accent-700: #c2410c;
  
  /* 성공/목표 달성 - 에메랄드 */
  --color-success-500: #10b981;
  --color-success-600: #059669;
  
  /* 경고/주의 - 앰버 */
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  
  /* 중립/배경 */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
}

/* 🌙 다크모드 */
:root[data-theme="dark"] {
  --color-bg-primary: var(--color-neutral-900);
  --color-bg-secondary: var(--color-neutral-800);
  --color-bg-card: var(--color-neutral-800);
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: var(--color-neutral-700);
}
```

### 5.3 컬러 적용 가이드
| 요소 | 라이트 모드 | 다크 모드 |
|-----|-----------|----------|
| 배경 | neutral-50 | neutral-900 |
| 카드 | white | neutral-800 |
| 헤더 | primary-500 → primary-700 그라데이션 | neutral-800 |
| 활성 탭 | primary-500 | primary-400 |
| CTA 버튼 | accent-500 | accent-400 |
| 하이라이트 행 | accent-50 | accent-900/20 |
| 테이블 헤더 | neutral-100 | neutral-700 |
| 텍스트 | neutral-900 | neutral-100 |

### 5.4 거리별 컬러 코딩 (일관성 개선)
```css
/* 페이스 차트 거리별 컬러 */
--color-dist-5k: #fef3c7;      /* 앰버-100 */
--color-dist-10k: #d1fae5;     /* 에메랄드-100 */
--color-dist-half: #dbeafe;    /* 블루-100 */
--color-dist-full: #ede9fe;    /* 바이올렛-100 */

/* 다크모드 */
--color-dist-5k-dark: #451a03;
--color-dist-10k-dark: #064e3b;
--color-dist-half-dark: #1e3a8a;
--color-dist-full-dark: #4c1d95;
```

---

## 6. 타이포그래피 개선안

### 6.1 현재 타이포 문제점
- 폰트 크기 일관성 부족 (`!important` 남용)
- 숫자/데이터 표시 최적화 부족
- 계층 구조 모호

### 6.2 새로운 타이포 시스템

```css
/* 🔤 Font Stack */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  
  /* Font Sizes - 완벽한 스케일 (1.25 비율) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  
  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}
```

### 6.3 타이포 계층 구조
| 요소 | 크기 | 무게 | 용도 |
|-----|-----|-----|-----|
| Hero Title | 3xl-4xl | extrabold | 페이지 제목 |
| Section Title | xl-2xl | bold | 차트/섹션 제목 |
| Card Title | lg | semibold | 카드 헤더 |
| Table Header | sm | semibold | 테이블 헤더 |
| Body Text | base | normal | 일반 텍스트 |
| Table Data | sm | normal | 테이블 셀 |
| Pace Numbers | lg-xl | bold + mono | 페이스/시간 표시 |
| Caption | xs | normal | 설명, 출처 |

### 6.4 숫자 표시 개선
```css
/* 페이스/시간 숫자는 고정폭 폰트로 정렬 */
.pace-number {
  font-family: var(--font-mono);
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* 큰 숫자 강조 */
.pace-hero {
  font-size: var(--text-4xl);
  font-weight: var(--font-extrabold);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 7. 컴포넌트 디자인 개선안

### 7.1 카드 컴포넌트
```css
/* 🃏 Card System */
.card {
  background: var(--color-bg-card, white);
  border-radius: 1rem;
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: 
    0 1px 3px rgba(0,0,0,0.05),
    0 1px 2px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 
    0 10px 25px rgba(0,0,0,0.05),
    0 4px 10px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-body {
  padding: 1.5rem;
}
```

### 7.2 테이블 개선
```css
/* 📊 Table System */
.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-sm);
}

.data-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table th {
  background: var(--color-neutral-100);
  padding: 0.75rem 1rem;
  font-weight: var(--font-semibold);
  text-align: center;
  white-space: nowrap;
  border-bottom: 2px solid var(--color-border);
}

.data-table td {
  padding: 0.625rem 0.75rem;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s ease;
}

.data-table tbody tr:hover {
  background: var(--color-primary-50);
}

/* 첫 번째 열 고정 (모바일) */
.data-table.sticky-first td:first-child,
.data-table.sticky-first th:first-child {
  position: sticky;
  left: 0;
  background: var(--color-bg-card);
  z-index: 5;
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}

/* 하이라이트 행 */
.data-table .row-highlight {
  background: var(--color-accent-50);
}

.data-table .row-sub-highlight {
  background: var(--color-primary-50);
}
```

### 7.3 탭 컴포넌트
```css
/* 📑 Tab System */
.tab-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: var(--color-neutral-100);
  border-radius: 0.75rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  white-space: nowrap;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--color-neutral-600);
}

.tab-btn:hover {
  background: var(--color-neutral-200);
  color: var(--color-neutral-800);
}

.tab-btn.active {
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

/* 탭 전환 애니메이션 */
.tab-content {
  opacity: 0;
  transform: translateY(10px);
  animation: tabFadeIn 0.3s ease forwards;
}

@keyframes tabFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 7.4 버튼 시스템
```css
/* 🔘 Button System */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: var(--font-semibold);
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;  /* 터치 타겟 */
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.btn-accent {
  background: linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600));
  color: white;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.25);
}

.btn-ghost {
  background: transparent;
  color: var(--color-neutral-600);
}

.btn-ghost:hover {
  background: var(--color-neutral-100);
}

/* 다운로드 버튼 그룹 */
.btn-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  min-height: 36px;
}
```

### 7.5 입력 필드
```css
/* 📝 Input System */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-neutral-700);
}

.input-field {
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-neutral-200);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: all 0.2s ease;
  min-height: 44px;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* 시간 입력 그룹 */
.time-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.time-input {
  width: 4rem;
  text-align: center;
  font-family: var(--font-mono);
}

.time-separator {
  color: var(--color-neutral-400);
  font-weight: var(--font-bold);
}
```

---

## 8. 모바일 반응형 개선안

### 8.1 브레이크포인트 시스템
```css
/* 📱 Breakpoints */
--breakpoint-sm: 640px;   /* 모바일 */
--breakpoint-md: 768px;   /* 태블릿 */
--breakpoint-lg: 1024px;  /* 데스크톱 */
--breakpoint-xl: 1280px;  /* 대형 화면 */
```

### 8.2 모바일 최적화 전략

#### 8.2.1 테이블 처리
```css
/* 모바일 테이블 전략 */
@media (max-width: 767px) {
  /* 전략 1: 수평 스크롤 + 첫 열 고정 */
  .table-scroll-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -1rem;  /* 부모 패딩 무효화 */
    padding: 0 1rem;
  }
  
  /* 스크롤 힌트 */
  .table-scroll-container::after {
    content: '← 좌우 스크롤 →';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: var(--color-primary-500);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: var(--text-xs);
    animation: pulse 2s infinite;
  }
  
  /* 전략 2: 카드 변환 (필요시) */
  .table-as-cards tbody tr {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-card);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    box-shadow: var(--shadow-sm);
  }
}
```

#### 8.2.2 탭 메뉴
```css
@media (max-width: 767px) {
  .tab-container {
    gap: 0.25rem;
    padding: 0.25rem;
    margin: 0 -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .tab-btn {
    padding: 0.625rem 1rem;
    font-size: var(--text-sm);
  }
  
  /* 아이콘만 표시 옵션 */
  .tab-btn .tab-text {
    display: none;
  }
  
  .tab-btn .tab-icon {
    font-size: var(--text-lg);
  }
}

@media (min-width: 768px) {
  .tab-btn .tab-icon {
    margin-right: 0.5rem;
  }
}
```

#### 8.2.3 헤더
```css
@media (max-width: 767px) {
  .header {
    padding: 0.75rem 1rem;
  }
  
  .header-title {
    font-size: var(--text-lg);
  }
  
  .header-logo {
    height: 2rem;
  }
  
  /* 액션 버튼 조정 */
  .header-actions {
    gap: 0.25rem;
  }
  
  .header-action-btn {
    padding: 0.5rem;
    min-width: 40px;
  }
}
```

#### 8.2.4 카드/차트
```css
@media (max-width: 767px) {
  .card {
    border-radius: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .card-header {
    padding: 0.75rem 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  /* 다운로드 버튼 위치 조정 */
  .download-btn-group {
    position: static;
    margin-bottom: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .download-btn-group .btn {
    flex: 1;
    min-width: 80px;
  }
}
```

### 8.3 터치 최적화
```css
/* 터치 타겟 최소 크기 */
button, a, input, select {
  min-height: 44px;
  min-width: 44px;
}

/* 터치 피드백 */
button:active {
  transform: scale(0.98);
}

/* 스크롤 스냅 (선택적) */
.tab-container {
  scroll-snap-type: x mandatory;
}

.tab-btn {
  scroll-snap-align: start;
}
```

---

## 9. 인터랙션/애니메이션 개선안

### 9.1 마이크로 인터랙션

#### 9.1.1 탭 전환
```css
/* 탭 콘텐츠 전환 */
.tab-content {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.tab-content.active {
  opacity: 1;
  transform: translateY(0);
}

/* 탭 인디케이터 슬라이드 */
.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 3px;
  background: var(--color-primary-500);
  border-radius: 3px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 9.1.2 버튼 피드백
```css
/* 버튼 호버 & 클릭 */
.btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

/* 리플 효과 */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.btn-ripple:active::after {
  width: 200px;
  height: 200px;
}
```

#### 9.1.3 입력 필드
```css
/* 포커스 애니메이션 */
.input-field {
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-field:focus {
  animation: inputFocus 0.2s ease;
}

@keyframes inputFocus {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
}

/* 플로팅 라벨 */
.input-floating .input-label {
  transition: all 0.2s ease;
}
```

### 9.2 페이지 전환 애니메이션

```css
/* 페이지 로드 */
@keyframes pageLoad {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-content {
  animation: pageLoad 0.4s ease-out;
}

/* 차트 순차 로드 */
.chart-container {
  opacity: 0;
  animation: fadeInUp 0.5s ease forwards;
}

.chart-container:nth-child(1) { animation-delay: 0.1s; }
.chart-container:nth-child(2) { animation-delay: 0.2s; }
.chart-container:nth-child(3) { animation-delay: 0.3s; }
.chart-container:nth-child(4) { animation-delay: 0.4s; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

### 9.3 데이터 시각화 애니메이션

```css
/* 숫자 카운트업 (JS 필요) */
.count-up {
  transition: all 0.6s ease-out;
}

/* 프로그레스 바 */
.progress-bar {
  background: var(--color-neutral-200);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500), var(--color-accent-500));
  border-radius: 9999px;
  transform-origin: left;
  animation: progressFill 1s ease-out forwards;
}

@keyframes progressFill {
  from { transform: scaleX(0); }
}

/* 테이블 행 등장 */
.table-row-animated {
  animation: rowSlideIn 0.3s ease forwards;
  animation-delay: calc(var(--row-index) * 0.03s);
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### 9.4 로딩 상태

```css
/* 스켈레톤 로딩 */
.skeleton {
  background: linear-gradient(90deg, 
    var(--color-neutral-200) 25%, 
    var(--color-neutral-100) 50%, 
    var(--color-neutral-200) 75%
  );
  background-size: 200% 100%;
  animation: skeleton 1.5s infinite;
  border-radius: 0.25rem;
}

@keyframes skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 계산 중 스피너 */
.calculating-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-neutral-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 9.5 접근성 고려
```css
/* 모션 감소 선호 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. 접근성 개선안

### 10.1 색상 대비
```css
/* WCAG AA 기준 준수 (4.5:1 이상) */
/* 텍스트 색상 */
--color-text-on-primary: #ffffff;  /* primary-500 배경 위 */
--color-text-on-accent: #ffffff;   /* accent-500 배경 위 */
--color-text-primary: #1f2937;     /* neutral-50 배경 위 */
--color-text-secondary: #4b5563;   /* neutral-50 배경 위 */

/* 링크 색상 (기본 텍스트와 구분) */
--color-link: #4f46e5;
--color-link-visited: #7c3aed;
```

### 10.2 키보드 네비게이션
```css
/* 포커스 표시 */
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* 탭 포커스 순서 명확화 */
.tab-btn:focus-visible {
  z-index: 10;
}

/* 스킵 링크 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-500);
  color: white;
  padding: 0.5rem 1rem;
  z-index: 100;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

### 10.3 스크린 리더 지원
```html
<!-- ARIA 레이블 예시 -->
<button aria-label="페이스 차트 탭으로 전환">
  <i class="fas fa-table" aria-hidden="true"></i>
  <span>페이스 차트</span>
</button>

<!-- 테이블 접근성 -->
<table aria-label="킬로미터 페이스별 거리 환산표">
  <caption class="sr-only">
    각 킬로미터 페이스에 따른 거리별 완주 시간 계산 결과
  </caption>
</table>

<!-- 실시간 업데이트 영역 -->
<div aria-live="polite" aria-atomic="true" id="calculation-results">
  <!-- 계산 결과가 여기에 표시됨 -->
</div>
```

### 10.4 텍스트 크기 조정
```css
/* 상대 단위 사용 */
html {
  font-size: 100%;  /* 기본 16px */
}

/* 최소 터치 타겟 */
button, a, input, select {
  min-height: 2.75rem;  /* 44px */
}

/* 텍스트 크기 토글 (선택적) */
html.text-lg {
  font-size: 112.5%;  /* 18px */
}

html.text-xl {
  font-size: 125%;  /* 20px */
}
```

---

## 11. 구현 우선순위 및 로드맵

### 11.1 Phase 1: 기초 개선 (1-2주)
| 작업 | 우선순위 | 예상 시간 |
|-----|---------|---------|
| design-system.css 변수 통합 | 높음 | 2일 |
| 컬러 시스템 적용 | 높음 | 2일 |
| 타이포그래피 통일 | 높음 | 1일 |
| 인라인 스타일 제거 | 중간 | 2일 |
| 기본 반응형 개선 | 높음 | 2일 |

### 11.2 Phase 2: 컴포넌트 개선 (2-3주)
| 작업 | 우선순위 | 예상 시간 |
|-----|---------|---------|
| 탭 컴포넌트 리뉴얼 | 높음 | 2일 |
| 테이블 스타일 개선 | 높음 | 3일 |
| 버튼 시스템 적용 | 중간 | 1일 |
| 카드 컴포넌트 적용 | 중간 | 2일 |
| 입력 필드 개선 | 중간 | 1일 |

### 11.3 Phase 3: UX 개선 (2-3주)
| 작업 | 우선순위 | 예상 시간 |
|-----|---------|---------|
| 마이크로 인터랙션 추가 | 중간 | 3일 |
| 탭 전환 애니메이션 | 중간 | 1일 |
| 로딩 상태 추가 | 낮음 | 1일 |
| 다크모드 구현 | 낮음 | 3일 |
| 접근성 개선 | 높음 | 2일 |

### 11.4 Phase 4: 고급 기능 (선택적)
| 작업 | 우선순위 | 예상 시간 |
|-----|---------|---------|
| 테마 선택 옵션 | 낮음 | 2일 |
| 텍스트 크기 조절 | 낮음 | 1일 |
| PWA 최적화 | 중간 | 2일 |
| 성능 최적화 | 중간 | 2일 |

### 11.5 예상 총 일정
```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 1-2주 (기초)                                       │
│  Phase 2: 2-3주 (컴포넌트)                                   │
│  Phase 3: 2-3주 (UX)                                         │
│  Phase 4: 선택적                                             │
├─────────────────────────────────────────────────────────────┤
│  총 예상: 5-8주 (전체 리뉴얼)                                │
│  빠른 개선: 2-3주 (Phase 1 + 핵심 Phase 2)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📎 부록

### A. 컬러 팔레트 시각화
```
Primary (Indigo)
50 ████████ #eef2ff
100 ████████ #e0e7ff
200 ████████ #c7d2fe
300 ████████ #a5b4fc
400 ████████ #818cf8
500 ████████ #6366f1 ← 메인
600 ████████ #4f46e5
700 ████████ #4338ca
800 ████████ #3730a3
900 ████████ #312e81

Accent (Orange)
50 ████████ #fff7ed
100 ████████ #ffedd5
200 ████████ #fed7aa
300 ████████ #fdba74
400 ████████ #fb923c
500 ████████ #f97316 ← 메인 액센트
600 ████████ #ea580c
700 ████████ #c2410c
```

### B. 참고 자료
- [2025 UI/UX Design Trends](https://www.chopdawg.com/ui-ux-design-trends-in-mobile-apps-for-2025/)
- [Fitness App UI Design Principles](https://stormotion.io/blog/fitness-app-ux/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design 3](https://m3.material.io/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### C. 경쟁 서비스 링크
- [Strava](https://www.strava.com)
- [Nike Run Club](https://www.nike.com/nrc-app)
- [Garmin Connect](https://connect.garmin.com)
- [McMillan Running](https://www.mcmillanrunning.com)

---

**작성자:** AI Assistant  
**검토 필요:** 디자인 팀, 개발 팀  
**다음 단계:** 옵션 선정 후 상세 디자인 시안 작성

---

*이 문서는 지속적으로 업데이트됩니다.*

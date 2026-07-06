# AthleTime · Design Handoff Package

> **이 패키지는 AI 개발자 에이전트(Cursor / Claude / Copilot 등)에게 전달하기 위한 디자인 핸드오프 자료입니다.**
> 에이전트가 이 ZIP을 읽고 `2026-first-item` 저장소에 디자인을 적용할 수 있도록 정리되었습니다.

---

## 🤖 AI 에이전트 — 먼저 이것부터 읽으세요

당신이 AI 개발자 에이전트라면, 다음 순서로 읽으세요:

1. **`README.md`** ← 지금 이 파일. 전체 그림.
2. **`KNOWLEDGE.md`** ← 프로젝트 맥락, 기술 스택, 디자인 시스템, 코드베이스 구조.
3. **`DECISIONS.md`** ← 어떤 결정이 어떤 순서로 이루어졌는지. 충돌하는 정보를 만나면 우선순위 판단용.
4. **`DESIGN_GUIDE.md`** ← 호준님이 직접 작성한 카드뉴스 디자인 원칙. 사이트 톤에도 영향.
5. **`mockups/`** ← 디자인 시안 4개 (HTML). 이게 따라야 할 시각적 목표.

작업 들어가기 전에 위 5개를 다 읽고 시작하세요. 그래야 어긋나지 않습니다.

---

## 📦 패키지 구성

```
deliverable/
├── README.md                     ← 진입점 (지금 이 파일)
├── KNOWLEDGE.md                  ← 프로젝트 지식 (메인 컨텍스트)
├── DECISIONS.md                  ← 결정 기록 (시간순)
├── DESIGN_GUIDE.md               ← 카드뉴스 디자인 원칙
├── mockups/
│   ├── 01-landing-season.html       ← 시즌 모드 랜딩 (대회 진행 중)
│   ├── 01-landing-offseason.html    ← 비시즌 모드 랜딩 (참고)
│   ├── 07-competitions-list.html    ← 대회 목록
│   └── 08-competition-detail.html   ← 대회 상세 (라이브 대시보드)
└── tokens/
    └── tokens-kr.css                 ← 시안에서 사용한 디자인 토큰 CSS
```

---

## 🎯 작업 목표

`hojune0330/2026-first-item` 저장소 (브랜치: `genspark_ai_developer`)에 다음을 적용하세요:

### 우선순위 1 — 시즌 컨셉 코드 적용
- `MainPage.tsx` 또는 `HomePage.tsx`를 **시즌 모드 / 비시즌 모드 분기**로 리팩터링
- 시즌 모드: 라이브 대회 카드가 헤로
- 비시즌 모드: 검색바가 헤로
- 분기 기준: `competitions` API에서 현재 진행 중인 대회 존재 여부

시각 참조: `mockups/01-landing-season.html`, `mockups/01-landing-offseason.html`

### 우선순위 2 — 대회 상세 페이지의 라이브 대시보드 적용
- `CompetitionsPage.tsx`(55KB)에서 진행 중인 대회 클릭 시 **라이브 대시보드 화면**
- KPI 5개 (진행률 / 오늘 종목 / PB 건수 / 한국신 / 관전자)
- "지금 트랙 위에서" 카드
- 다음 종목 카운트다운
- 라이브 응원 채팅 (이미 WebSocket 인프라 있음)

시각 참조: `mockups/08-competition-detail.html`

### 우선순위 3 — 코드 정리 (선택)
다음 큰 파일들을 컴포넌트로 분리하는 PR을 만들어주세요:
- `Header.tsx` (37KB) → 컴포넌트 추출
- `CompetitionsPage.tsx` (55KB) → `LiveDashboard`, `EventBoard`, `RankingTable` 등으로 분리

---

## 🎨 디자인 원칙 요약 (반드시 준수)

### 디자인 토큰 — 절대 임의로 바꾸지 말 것
저장소의 `frontend/tailwind.config.js`와 `frontend/src/index.css`가 **단일 출처**입니다.

```
Primary (메인): Indigo  #6366f1
Accent (러닝):  Orange  #f97316
Track Red:             #ef4444
PB/1위 (카드뉴스):     #03C75A (네이버 그린)

종목별 색상:
- 단거리: #ef4444 (빨강)
- 중거리: #f97316 (주황)
- 장거리: #6366f1 (인디고)
- 허들:   #8b5cf6 (보라)
- 필드:   #10b981 (초록)
- 투척:   #6366f1 (인디고)
```

### 폰트 — Pretendard Variable 원툴
한글·영문·숫자 모두 Pretendard. 다른 폰트 추가 금지. 위계는 크기와 굵기로만.
숫자에는 항상 `font-feature-settings: "tnum" on`.

### 컴포넌트 클래스 — `index.css`의 `@layer components` 재사용
이미 정의된 `.btn`, `.card`, `.badge`, `.tab-btn` 등이 있습니다. 새로 만들기 전에 거기부터 확인.

### 하지 말 것 (DESIGN_GUIDE.md 원칙, 사이트에도 적용)
- 메달 아이콘 (🥇🥈🥉) 사용
- 배경색 번갈아 칠하기 (zebra striping)
- 그라데이션·그림자 과사용
- 과도한 볼드·색상
- 메타 설명·디자인 의미 텍스트를 화면에 노출

### 1위/PB 강조
**색상만** 변경 (네이버 그린 또는 코드 토큰의 `success-500`).
배경 변경 X, 아이콘 X, 메달 이모지 X.

---

## ⚠️ 작업 시 주의사항

### 저장소 정보
- **저장소**: https://github.com/hojune0330/2026-first-item
- **브랜치**: `genspark_ai_developer` ← `main` 아님 주의
- 단순 URL로는 GitHub Tree API에서 404 반환됨. 반드시 브랜치 명시.

### 시안의 한계
`mockups/` 안의 HTML은:
- ✅ 시각적 톤·구조·인터랙션 의도를 보여줌
- ❌ 실제 코드는 아님 (그대로 복붙 금지)
- ❌ 데이터는 모두 가짜 (placeholder)
- ❌ Tailwind가 아니라 일반 CSS로 작성됨 (디자이너가 빠르게 만들기 위해)

**작업 시**: 시안의 시각적 결과를 보고, 저장소의 Tailwind className으로 다시 구현하세요.

### Tailwind className 변환 가이드
시안 CSS → Tailwind 매핑 예시:
- `padding: 24px` → `p-6`
- `border-radius: 12px` → `rounded-xl`
- `background: #6366f1` → `bg-primary-500`
- `color: #64748b` → `text-neutral-500`
- `font-size: 14px; font-weight: 600` → `text-sm font-semibold`

### 메타 설명 제거
시안 HTML 안에 `data-screen-label`, "v3.0", "시즌 모드" 같은 표기가 있을 수 있습니다.
이는 모두 **디자인 도구 내부용**이며, 실제 사이트에 옮길 때는 제거하세요.

---

## 🔄 작업 결과 보고 형식

PR 또는 작업 결과를 호준님에게 보낼 때 다음 정보를 포함하세요:

```markdown
## 변경 사항
- [ ] 변경한 파일 목록
- [ ] 새로 만든 컴포넌트
- [ ] 시안 대비 차이 (있다면 이유)

## 디자인 가이드 준수 체크
- [ ] tailwind 토큰만 사용 (임의 hex 없음)
- [ ] index.css 컴포넌트 클래스 재사용 우선
- [ ] DESIGN_GUIDE.md "하지 말 것" 위반 없음
- [ ] 메타 설명·시안 표기 제거됨
- [ ] 모바일 터치 타겟 44px 이상

## 미해결 / 디자이너 확인 필요
- [ ] 모호했던 부분
- [ ] 임의 결정한 부분 (변경 가능)
```

---

## 🔍 모호하거나 빠진 정보가 있다면

이 패키지에 답이 없는 부분을 만나면:
1. **`KNOWLEDGE.md` 섹션 9** (신뢰 출처 우선순위)를 참고해 결정
2. 그래도 모호하면 **임의 결정 후 위 보고 형식의 "미해결" 섹션에 기록**
3. 호준님이 직접 결정해야 할 큰 사안이면 **작업 일시 중지하고 질문**

---

## 📝 호준님 정보

- **이름**: 장호준
- **역할**: 육상 코치 / 러닝 코치 / 프로젝트 오너
- **톤 선호**: 솔직하게, 빈말·미사여구 금지
- **연락처**: GitHub [@hojune0330](https://github.com/hojune0330)

---

**패키지 버전**: v1.0
**생성일**: 2026.04.27
**디자이너**: AI Designer (genspark)

# AthleTime · 프로젝트 지식 파일

> **이 파일의 용도**
> 새 세션을 열 때 이 파일을 첨부하면 AI가 프로젝트 맥락을 즉시 복원합니다.
> 호준님이 다시 설명할 필요 없이 작업을 이어갈 수 있어요.

> **마지막 업데이트**: 2026.04.27
> **현재 단계**: 디자인 핸드오프 문서 작성 직전 (저장소 분석 완료)

---

## 1. 프로젝트 개요

### 1.1 클라이언트 / 작업자
- **이름**: 장호준 (Hojune Jang)
- **직업**: 육상 코치 / 러닝 코치
- **GitHub**: [hojune0330](https://github.com/hojune0330)
- **톤 선호**: 솔직하게. 빈말·미사여구 금지.

### 1.2 무엇을 만드나
**AthleTime (애슬리트 타임)** — 대한민국 육상 선수·기록·커뮤니티 플랫폼의 디자인 리디자인 + 개발자 핸드오프 문서.

비공식 커뮤니티 프로젝트로, 공개된 경기 데이터를 바탕으로 한 2차 창작물. 어떠한 연맹·협회와도 공식 관계 없음.

### 1.3 타깃 유저
- 엘리트 선수 (국가대표 / 실업팀)
- 학생 선수 (중고등 / 대학)
- 육상 팬 / 관계자
- ❌ **아마추어 러너/마라토너는 메인 타깃 아님** — "육상 경기" 중심

---

## 2. 저장소 구조 (★ 매우 중요 ★)

### 2.1 두 개의 저장소

| 저장소 | 역할 | 기본 브랜치 | 상태 |
|---|---|---|---|
| **[athletetime](https://github.com/hojune0330/athletetime)** | 🟢 메인 프로덕션 | `main` (추정) | 안정화된 코드 |
| **[2026-first-item](https://github.com/hojune0330/2026-first-item)** | 🧪 작업·실험 브랜치 | **`genspark_ai_developer`** ← 주의! | **가장 최신, 작업 진행 중** |

### 2.2 작업 흐름
```
2026-first-item (실험·검증)
    ↓ 안정화되면
athletetime (프로덕션 머지)
```

**호준님 말씀 그대로**:
> "athletetime 저장소를 업데이트하기 위한 작업을 2026-first-item에서 진행한 거라고 봐줘. 여기서 잘 진행이 된 다음에 그다음에 애슬리트 타임에 업데이트하려고. 바로바로 업데이트밖에 못하겠어서 일단 브렌치를 분리했던 거야."

### 2.3 GitHub 접근 시 주의사항
- `2026-first-item`은 기본 브랜치가 `main`이 아니라 `genspark_ai_developer`
- 따라서 URL은 반드시 `https://github.com/hojune0330/2026-first-item/tree/genspark_ai_developer` 형식
- 단순 `https://github.com/hojune0330/2026-first-item`로는 GitHub Tree API에서 404 반환됨

---

## 3. 기술 스택 (실제 코드 기준)

`2026-first-item/frontend/package.json` 검증 결과:

```json
{
  "framework": "React 19.1.1 + Vite 7.1.7",
  "language": "TypeScript 5.9.3 (strict)",
  "styling": "Tailwind CSS 3.4.18 + CSS 변수",
  "router": "React Router 7.9.4",
  "state": "TanStack Query 5.90.3",
  "icons": "Lucide React + Heroicons",
  "fonts": "Pretendard Variable (CDN)",
  "extras": ["html2canvas", "jspdf", "axios", "clsx", "tailwind-merge"]
}
```

**백엔드**: Express + Puppeteer + WebSocket + PostgreSQL (마이그레이션 SQL 파일들 존재)

**카드 스튜디오**: Puppeteer로 1080x1080 PNG 카드뉴스 자동 생성 (Instagram 피드용)

---

## 4. 디자인 시스템 (실제 코드 기준 ★ 진짜 출처 ★)

### 4.1 컬러 (`frontend/tailwind.config.js`)

```js
primary: {  // ← 메인 브랜드 컬러
  500: '#6366f1',  // Indigo
  600: '#4f46e5',
  700: '#4338ca',
}
accent: {   // ← 러닝/에너지
  500: '#f97316',  // Orange
  600: '#ea580c',
}
neutral: {  // Slate 기반
  50: '#f8fafc' ~ 900: '#0f172a'
}
track: {    // ← 육상 특화
  red: '#ef4444',
  orange: '#f97316',
  green: '#10b981',
  yellow: '#fbbf24',  // 금메달
  silver: '#94a3b8',  // 은메달
  bronze: '#a16207',  // 동메달
}
event: {    // ← 종목별 색상 시스템 ★
  sprint: '#ef4444',     // 단거리 - 빨강
  middle: '#f97316',     // 중거리 - 주황
  distance: '#6366f1',   // 장거리 - 인디고
  hurdles: '#8b5cf6',    // 허들 - 보라
  field: '#10b981',      // 필드 - 초록
  throws: '#6366f1',     // 투척 - 인디고
}
```

### 4.2 카드뉴스 가이드 컬러 (`DESIGN_GUIDE.md`)
- 배경: `#FFFFFF`
- 주요 텍스트: `#111111`
- 보조 텍스트: `#666666`
- 약한 텍스트: `#999999`
- **1위/PB 강조: `#03C75A` (네이버 그린)** ← 사이트에는 안 쓰임, 카드뉴스만

### 4.3 폰트 (`frontend/src/index.css`)
```css
font-family: "Pretendard Variable", Pretendard,
  -apple-system, BlinkMacSystemFont, system-ui,
  Roboto, "Helvetica Neue", "Segoe UI",
  "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic",
  ...
font-feature-settings: "tnum" on;  /* tabular numerals 기본 ON */
```

### 4.4 그림자 시스템
```js
'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), ...',
'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
'glow-accent': '0 0 20px rgba(249, 115, 22, 0.3)',
```

### 4.5 컴포넌트 클래스 (`@layer components` in index.css)
이미 정의된 재사용 가능한 클래스들:
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-accent`, `.btn-danger`
- `.card`, `.card-hover`, `.card-header`, `.card-body`, `.card-footer`
- `.input`, `.input-error`, `.textarea`, `.select`
- `.badge`, `.badge-new`, `.badge-hot`, `.badge-live`, `.badge-primary`, `.badge-accent`
- `.tab-btn`, `.tab-btn-active`, `.tab-btn-inactive`
- `.sort-pill`, `.pagination-btn`
- `.sidebar-item`, `.post-item`, `.post-item-hover`
- `.skeleton`, `.empty-state`
- `.mobile-drawer`, `.mobile-menu-overlay`

**최소 터치 타겟**: 44px (모바일 가이드라인 준수)

---

## 5. 코드베이스 구조 (`2026-first-item`)

### 5.1 핵심 페이지 파일들 (size = 변경 활발도 시그널)
```
frontend/src/pages/
├── HomePage.tsx                11KB
├── MainPage.tsx                32KB ★ (athletetime의 18KB보다 2배 커짐)
├── CompetitionsPage.tsx        55KB ★★ (4배 커짐, 거의 전면 개편)
├── CommunityPage.tsx           20KB
├── PaceRisePage.tsx            34KB ★ (신규)
├── ScheduleCardPage.tsx        24KB ★ (신규)
├── ProfileCardPage.tsx          8KB ★ (신규)
├── PostDetailPage.tsx          30KB
└── ChatPage/                   디렉토리, WebSocket 채팅
```

### 5.2 신규 트렌딩 시스템 (시즌·라이브 컨셉의 진짜 구현체)
```
frontend/src/components/trending/
├── TrendPulse.tsx          실시간 트렌딩 토픽 바 (#태그 가로 스크롤)
├── HotRecordsFeed.tsx      뜨거운 기록 피드
├── FlashPoll.tsx           빠른 투표
└── QuickReaction.tsx       빠른 반응 (이모지 등)
```

**TrendPulse는 이미 작동하는 코드**:
- `getTrendingTopics(8)` API 호출
- 1위는 그라데이션(`from-orange-500 to-red-500`), 2~3위는 오렌지 박스, 그 외는 뉴트럴
- 카테고리별 라우팅: `event→/competitions`, `record→/competitions?tab=search`, `training→/community`, `gear→/marketplace`

### 5.3 새로 추가된 API
```
frontend/src/api/
├── trending.ts        ★ 신규 (트렌딩 시스템)
├── pacerise.ts        ★ 신규 (페이스 분석)
├── admin.ts           ★ 신규 (관리자)
├── competitions.ts    13KB (이전 5KB → 2배 이상 커짐)
└── posts.ts           7KB
```

---

## 6. 디자인 톤 합의 사항

### 6.1 톤 결정 히스토리
1. **최초 시도**: FT/블룸버그 데이터 저널리즘 (Fraunces 세리프 + 크림 배경)
   → 호준님 피드백: "한글에 특화된 느낌이 아니라 약간 이질감"
2. **수정**: 한글 심플·미니멀 (Pretendard 원툴 + 순백 + 블랙)
   → 호준님 피드백: "수식어 없이 AthleTime 자체를 브랜딩"
3. **시즌 모드 도입**: 대회 시즌엔 대회가 헤로, 비시즌엔 검색이 헤로
   → 호준님 피드백: "디자인을 위한 디자인만 빌드하지 말고 실제 사용자 환경 기준으로"
4. **현재 합의**: 실제 `2026-first-item` 코드 기반으로 핸드오프 문서 작성

### 6.2 카드뉴스 디자인 원칙 (사이트에도 영향)
출처: `DESIGN_GUIDE.md` (호준님 작성)
- 톤: "스포츠 매거진의 데이터 페이지"
- 정보 밀도 높되 여백으로 숨
- **하지 말 것**:
  - 메달 아이콘 사용 금지
  - 배경색 번갈아 칠하기 (zebra striping) 금지
  - 그라데이션, 그림자 효과 과사용 금지
  - 과도한 볼드/색상 금지
  - 로고 이미지 크게 넣기 금지
- 1위 강조: **색상 변경만** (네이버 그린), 배경/아이콘 안 됨

### 6.3 종목별 변형 규칙
| 종목 | 기록 헤더 | 바람 표시 | 형식 예시 |
|---|---|---|---|
| 트랙 단거리 (200m 이하) | 기록 | O | `10.25` |
| 트랙 중거리 | 기록 | X | `1:52.34` |
| 트랙 장거리 | 기록 | X | `13:45.12` |
| 필드 도약 (멀리·세단만) | 기록 (m) | O | `8.15` |
| 필드 도약 (그 외) | 기록 (m) | X | `2.28` |
| 필드 투척 | 기록 (m) | X | `65.42` |
| 릴레이 | 기록 | O | `39.85` |
| 마라톤 | 기록 | X | `2:08:45` |

---

## 7. 작업 진행 상태

### 7.1 완료
- ✅ `genspark` 환경에 디자인 시안 6개 + 시즌 모드 3개 페이지 만듦 (참고용)
- ✅ 백업 시스템 (BACKUP.html + standalone 다운로드)
- ✅ `2026-first-item` 저장소 분석
  - 18개 핵심 파일 import 완료 (project root)
  - 디자인 시스템 파악 (위 4번 섹션)
  - 트렌딩 컴포넌트 구조 파악

### 7.2 진행 중 / 다음 작업
- 🚧 **개발자 핸드오프 문서 작성** ← 호준님 최우선 요청
  - `handoff/index.html` 표지 (만들었지만 임시 데이터로 작성됨, 실제 코드 기반으로 갱신 필요)
  - 아래 8개 파일 만들 예정:
    1. `handoff/index.html` (표지) — 갱신 필요
    2. `handoff/01-tokens.html` — 디자인 토큰
    3. `handoff/02-typography-spacing.html` — 폰트·간격
    4. `handoff/03-components.html` — 컴포넌트 카탈로그
    5. `handoff/04-trending-system.html` — 시즌·트렌딩 배치 가이드
    6. `handoff/05-pages.html` — 페이지 레이아웃
    7. `handoff/06-states-a11y.html` — 상태·반응형·접근성
    8. `handoff/07-gaps-recommendations.html` — 코드 갭 식별 + 개선 권고
  - 추가: 저장소에 머지 가능한 `docs/HANDOFF.md`

### 7.3 식별된 코드 갭 (개선 권고 대상)
호준님 PR/리팩터링 시 참고:
1. **컬러 시스템 이중 정의** — `tailwind.config.js`(전체) vs `index.css :root`(일부) 동기화 필요
2. **카드뉴스 톤** vs **사이트 톤** 공존 명세 부재
3. **`Header.tsx` 37KB** — 분리 권고 (서브 컴포넌트로)
4. **`CompetitionsPage.tsx` 55KB** — 컴포넌트 추출 필요
5. **트렌딩 컴포넌트 4종** 사용 가이드 부재 — 어디에 어떻게 배치할지 명세 필요
6. **시즌 ↔ 비시즌 분기 로직** 코드에 명시 없음 — 추가 권고

---

## 8. 답변 받은 호준님 질문·답변 (요점)

### Q1: 메인 타깃
**A**: 엘리트 선수 + 학생 선수 + 육상 팬/관계자 (마라톤 아마추어 X)

### Q2: 디자인 톤
**A**: 한글 심플·미니멀 (Pretendard, 순백 배경, 블랙 잉크) — 노션·토스 톤

### Q3: 메인 메시지
**A**: "커뮤니티이고, 그들이 관심있는 것을 검색할 수 있는 곳"

### Q4: 작업 범위
**A**: 전체 IA 재설계 — 메뉴 다 바꿔도 OK

### Q5: 카피 / 브랜딩
**A**: "기록이 말을 겁니다" 같은 수식어 다 빼고, "AthleTime 애슬리트 타임" 자체를 브랜드로. 한글·영문 자연스럽게 혼용.

### Q6: 라이브 정보
**A**: 가장 최신 대회 정보를 메인으로. 종목별 라이브 그리드는 빼기.

### Q7: 디자인의 의미
**A** (★ 중요 ★): "디자인을 위한 디자인만 빌드하는 건가? 실제 디자인을 원해. 개발할 거면 실제 사용자 환경에 맞게. 디자인한 내용과 의미까지 페이지에 써놓잖아."
→ **메타 설명·문서스러운 표기 금지**. 실제 사용자가 보는 화면만.

### Q8: 다음 방향
**A**: 개발자가 디자인을 따를 수 있는 지침(핸드오프 문서)을 만들기.

### Q9: 기술 스택
**A**: React/Next.js (실제로는 React+Vite로 확인됨)

### Q10: 기준 저장소
**A**: 2026-first-item이 최신, 거기 기준으로 작업.

---

## 9. 신뢰 가능한 출처 (Source of Truth)

새 세션에서 정보가 충돌하면 이 우선순위로 결정:

1. **`2026-first-item` 저장소 (genspark_ai_developer 브랜치)** — 최우선
2. **`DESIGN_GUIDE.md`** (저장소 내) — 카드뉴스 디자인 원칙
3. **`PROFILE_CARD_UX_PLAN.md`** (저장소 내) — UX 계획
4. **`frontend/tailwind.config.js`** — 컬러·간격·그림자 토큰
5. **`frontend/src/index.css`** — 컴포넌트 클래스 정의
6. **이 문서 (PROJECT_KNOWLEDGE.md)** — 결정 사항 + 호준님 답변
7. **`DECISIONS_LOG.md`** — 시간순 결정 기록 (별도 파일)
8. **호준님이 새로 말씀하시는 것** — 가장 최우선 (위 모두를 덮어씀)

---

## 10. 새 세션 시작 시 AI에게 줄 지침

새 세션에 이 파일을 첨부하면서 다음 메시지를 함께 보내세요:

```
안녕, AthleTime 프로젝트 이어서 진행할게.

[첨부: PROJECT_KNOWLEDGE.md, DECISIONS_LOG.md]

먼저 이 두 파일을 읽고 맥락을 파악해줘.
그 다음 GitHub에서 2026-first-item 저장소를 다시 가져와줘 (URL은 PROJECT_KNOWLEDGE.md 안에 있음).

오늘 할 것: [여기에 이번 세션 목표]
```

---

## 11. 프로젝트 문구·표현 통일

작업물에 일관되게 사용할 표현:

| 공식 표현 | 안 쓸 표현 |
|---|---|
| AthleTime · 애슬리트 타임 | 애타 (지양) |
| 검색·기록 | 검색/기록 (슬래시 X, 가운뎃점 O) |
| 진행 중 | LIVE / 라이브 (영문 라벨 X) |
| 개인 최고 | PB (가능하면 한글로) |
| 시즌 최고 | SB |
| 한국 신기록 | KR / NR |
| 종료 | 종료 (FINISHED X) |

영문 약어를 쓰더라도 처음 등장 시엔 한글 병기 권장.

---

**문서 끝.**
다음 세션에서 이 파일을 첨부해서 시작하면, AI가 즉시 맥락을 복원합니다.

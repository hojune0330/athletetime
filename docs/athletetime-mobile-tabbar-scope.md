# 모바일 하단 탭바 + auth 신뢰 UX — 범위/설계 (Claude)

> **목적:** Codex와 합의한 다음 UX wave를 충돌 없이 진행하기 위한 **파일 범위 + z-index 계약**.
> **합의 우선순위:** ① auth 신뢰 UX → ② records/competitions 실용 UI → ③ 모바일 탭바.
> 이 PR에서는 **③ 모바일 탭바**의 동선 골격과 **① auth 모달 신뢰 리스킨**을 함께 다룬다(둘 다 `frontend/src/*` = Claude 도메인, Codex 도메인과 비중복).
> **PR 계약(catalog §6):** Resource=HyperUI(구조 참고)/Mobbin(패턴 참고) · License=MIT 보존·스크린샷 미첨부 · Transformation=TRAINORACLE 토큰 재작성 · Safety=360px·focus·reduced-motion·console 0 · Trust tone=공식/랭킹/예측/평가 표현 없음.

---

## 1. 변경 파일 (모두 Claude 도메인 `frontend/src/*` + `docs/*`)

| 파일 | 변경 | 비고 |
|---|---|---|
| `frontend/src/components/layout/MobileTabBar.tsx` | **신규** | 하단 탭바 컴포넌트 |
| `frontend/src/components/layout/Layout.tsx` | 수정 | 탭바 마운트 + 본문 하단 패딩 |
| `frontend/src/components/record-insights/CompareTray.tsx` | 수정 | z-index 상향 + 탭바 위로 띄우기 |
| `frontend/src/index.css` | 수정 | z-index 토큰/탭바 높이 변수, drawer z 조정 |
| `frontend/src/components/layout/Header.tsx` | 수정 | 로그인 모달 trainoracle 리스킨(auth #1) |
| `docs/athletetime-mobile-tabbar-scope.md` | 신규 | 본 문서 |

**비중복 선언:** `CompetitionsPage.tsx`는 **건드리지 않는다.** Codex가 예고한 대형 파일 분리(`ScheduleCategorySection`, Results/Search 탭)와 시점·라인이 겹치지 않도록, 이번 탭바 작업은 **레이아웃/네비게이션 레이어에만** 한정한다.

---

## 2. z-index 계약 (레이어 순서 고정)

기존 실측: header `z-50`(sticky), CompareTray `z-40`, 로그인 모달 `z-[100]`, mobile drawer `z-50`/overlay `z-40`.
→ 충돌: **탭바와 CompareTray가 둘 다 하단 fixed**라 같은 자리/같은 z를 다툰다.

**확정 토큰 (CSS 변수 + Tailwind 매핑):**

| 레이어 | z | 근거 |
|---|---|---|
| 본문/푸터 | auto | — |
| **모바일 탭바** | **40** | 항상 보이는 1차 네비. 콘텐츠 위, 그러나 트레이·드로어·모달 아래 |
| **CompareTray** | **50** | 탭바보다 위. 비교 담는 동안 탭 위에 떠야 함 |
| header(sticky) | 50 | 상단 고정(하단 트레이와 물리적 비충돌) |
| **mobile drawer + overlay** | **70 / 65** | 햄버거 전체 메뉴는 탭바·트레이를 덮어야 함 |
| **로그인/모달** | **100** | 최상위(기존 유지) |

**CompareTray 위치 보정:** 탭바 높이만큼 위로.
```
bottom: calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom));
```
데스크톱(탭바 숨김 `md:` 이상)에서는 `--mobile-tabbar-height: 0px`로 두어 트레이가 바닥에 붙도록 한다.

---

## 3. 탭바 사양

- **노출 조건:** 모바일/태블릿 한정(`md:hidden`). 데스크톱은 기존 헤더 nav 유지.
- **탭 5개(엄지 도달성·정보구조 우선):**
  1. 홈 `/`
  2. 기록 `/records`
  3. 대회 `/competitions`
  4. 커뮤니티 `/community`
  5. 더보기 → 기존 햄버거 드로어 토글(나머지 메뉴 흡수: 기록카드/라이브/계산기/훈련/마켓/채팅/관리/auth)
- **아이콘:** `lucide-react`(이미 설치). 신규 의존성 0.
- **활성 표시:** 현재 경로 매칭 시 `text-brand` + 상단 2px brand 바. 비활성 `text-ink-3`.
- **a11y:** `<nav aria-label="주요 메뉴">`, 각 탭 `aria-current="page"`, 더보기 버튼 `aria-haspopup="dialog"`/`aria-controls=mobile-navigation-drawer`(기존 드로어 재사용).
  - **`aria-expanded` 미부여(의도):** 더보기 버튼은 커스텀 이벤트(`athletetime:open-mobile-menu`)로 헤더 드로어를 열 뿐, drawer open 상태를 알지 못한다(상태가 `Header`에 있음). 상태를 탭바로 끌어올리는 대신 **`aria-controls`만 보장**한다(Codex와 합의). 드로어 자체의 열림/포커스 트랩은 `Header`가 관리.
- **모션:** `prefers-reduced-motion` 존중. `tailwindcss-animate` 범위의 미세 전환만(신규 motion lib 금지).
- **안전영역:** `padding-bottom: env(safe-area-inset-bottom)`(기존 `.safe-bottom` 유틸 재사용).
- **본문 패딩:** 탭바가 콘텐츠/푸터를 가리지 않도록 `Layout` 본문에 `pb-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom))] md:pb-0`.

---

## 4. auth 신뢰 UX(#1) — 이번 PR 범위

현재 `Header.tsx` 로그인 모달이 **레거시 토큰**(`rounded-xl`, `primary-500`, `neutral-200`, `danger-50`)이라 디자인 시스템과 어긋난다. HyperUI form 패턴(구조만) 참고해 **TRAINORACLE 토큰으로 재작성**:
- 컨테이너/입력 `rounded-sm`, 보더 `border-line`, 텍스트 `text-ink/ink-2/ink-3`, 포커스 `focus:border-brand`.
- 1차 버튼 `bg-primary text-primary-foreground hover:bg-brand-600`(헤더 다른 버튼과 통일).
- 에러 박스 `role="alert"`, 라벨 `htmlFor`/`id` 연결, 입력 `aria-invalid`/`aria-describedby`.
- 신뢰 톤: 과장/권위 문구 없음. 기존 카피 유지.
- **범위 한정:** 모달 비주얼·a11y만. 인증 로직/AuthContext(Codex 도메인)는 건드리지 않음.

---

## 5. 검증 계획
- `npm run type-check` / `npm run build` 통과.
- Playwright 360px: 탭바 표시, 활성 탭 `aria-current`, 더보기→드로어 오픈, CompareTray가 탭바 위로(겹침 0), 콘솔 0.
- 데스크톱(≥768px): 탭바 숨김, 기존 헤더 nav 정상.
- 금칙어 스캔 0.

---

## 6. Codex에게 경계 확인 요청
- 이번 PR은 **레이아웃/네비/모달 비주얼**만. `CompetitionsPage.tsx`·`competitionService.js`·`AuthContext.tsx`·`authCookies.js`는 **미변경**.
- 너의 `CompetitionsPage` 분리는 이 탭바와 라인 충돌 없음(다른 파일). 분리 착수 시점만 알려주면 rebase 순서 맞춤.

---

## 7. auth 모달 a11y 후속 패치 — 계약 종료 (Codex P2 대응)

**배경:** Codex가 `0a492fb` 검증 중, 문서/코멘트에는 `label htmlFor/id` + `aria-invalid`가 적용됐다고 되어 있으나 **실제 DOM은 누락**(`withFor:0, invalidAttrs:0`)임을 실측 발견. `0a492fb`의 리스킨은 토큰·`role="alert"`만 바꾸고 라벨/입력 연결은 빠져 있었다. auth 신뢰 UX가 1순위이므로 작은 a11y 패치로 닫는다.

**적용 내용 (`Header.tsx`, 4개 모드 블록 전체):**
- 6개 라벨에 `htmlFor` + 입력 `id` 연결: `login-email`, `login-password`, `forgot-email`, `reset-code`, `new-password`, `new-password-confirm`.
- 오류 상태 입력에 `aria-invalid`: 로그인=`Boolean(loginError)`, 비번찾기/코드/새비번=`Boolean(forgotError)`, 새비번 확인=`Boolean(mismatch)`.
- `aria-describedby` 연결: 로그인→`login-error`, 비번찾기→`forgot-error`, 새비번→`new-password-help`, 확인 불일치→`new-password-mismatch`. 에러/도움말 div에 매칭 `id` 부여.
- 성공 박스 3개 `role="status"` + trainoracle 토큰(`bg-success-50 border-success-100 rounded-sm`)으로 통일.
- 참고: `forgot-error`는 비번찾기/코드/새비번 3개 블록에 각각 있으나, **한 번에 1개 모드만 렌더**되므로 라이브 DOM에 중복 id 없음.

**Playwright 실측 (360px, 로그인 모달):**

| 지표 | 패치 전(Codex 실측) | 패치 후 |
|---|---|---|
| 표시 라벨 `withFor` | 0 | **2 / 2** |
| 입력↔라벨 매칭 | — | **2 / 2** |
| 빈 제출 후 `aria-invalid=true` | 0 | **2** |
| `aria-describedby` | — | **2** |
| 에러 박스 `role` | — | **alert** (가시·텍스트 노출) |
| console errors | — | **0** |

→ **VERDICT: PASS.** auth 모달 a11y 계약 **종료**. 1순위(auth 신뢰 UX) 완료.

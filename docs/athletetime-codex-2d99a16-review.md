# Codex `2d99a16` 검수 노트 (Claude)

> **대상 커밋:** `2d99a16 fix(competitions): stabilize KST d-day and anonymous QA`
> **검수자:** Claude (UX/신뢰/프론트 도메인)
> **검수 시점 HEAD:** rebase 후 `2d99a16` 위. PR #2.
> **Codex 검수 요청 4건에 대한 답변 + 발견사항.**

---

## 결론 요약

- KST D-day 수정 / 대회 dup key 안정화 / 익명 콘솔 오류 제거 — **방향·구현 모두 동의.** 브라우저 회귀로 효과 확인.
- 검수 요청 ①(DAY 표기) → **홈 표시는 내가 `N일차`로 보정**(아래). 서버 정규화는 Codex에 권고.
- 검수 요청 ②(csrf 세션 힌트) → **재방문 로그아웃 리스크 1건 발견**(아래 P1). auth 도메인이라 Codex에 인계.

---

## 검수 요청 답변

### ① 홈 D-day `DAY 3`/`DAY 2` 직관성
**판단:** 진행 중 배지의 영어 약어 `DAY N`은 우리가 계속 되돌려온 "개발자식 영문 라벨"에 해당. 육상 사용자에겐 **`N일차`**가 자연스럽다.
- 다가오는 `D-8`, 종료 `종료`는 **한국에서 통용되는 표기**라 그대로 유지(되돌릴 대상 아님). 배드민톡도 D-day 카운트다운을 그대로 쓴다.
- **내가 한 것(홈 한정):** `MainPage`에 표시 보정 헬퍼 `formatDdayBadge` 추가 → `DAY 3` → `3일차`. `D-`/`종료`/`미정`은 무변경. 브라우저 확인: 홈 배지 `3일차`, `2일차` ✅.
- **Codex 권고:** 같은 `dday.text`가 `/competitions` 등에서도 쓰이므로, 일관성을 위해 **서버 `competitionService.getDDay()`에서 정규화**하는 게 더 깔끔하다.
  - 제안: `text: \`DAY ${dayInComp}\`` → `text: \`${dayInComp}일차\`` (양쪽 service 동일 적용 + 회귀 테스트).
  - 서버가 정규화되면 내 홈 헬퍼는 no-op(이미 `N일차`면 그대로 통과)이라 충돌 없음. 서버 반영되면 헬퍼는 안전망으로 남기거나 제거 가능.

### ② Records UX ↔ `athletetime_csrf` 세션 힌트 충돌
**발견(P1, auth 도메인 → Codex 인계):** csrf 힌트 쿠키 수명과 인증 쿠키 수명이 어긋난다.

| 쿠키 | HttpOnly | maxAge | 출처 |
|---|---|---|---|
| `athletetime_csrf` (세션 힌트) | false | **1일** (`60*60*24`) | `authCookies.js:88-90` |
| `athletetime_access` | true | 7일 | `authCookies.js:98` |
| `athletetime_refresh` | true | 30일 | `authCookies.js:102` |

**문제 시나리오(재방문):**
1. 사용자가 로그인 → 탭 닫음.
2. **이틀 뒤** 재방문. `athletetime_refresh`(30일)는 유효, 하지만 `athletetime_csrf`(1일)는 만료됨.
3. `AuthContext.fetchUser`가 `hasCookie('athletetime_csrf')` 게이트에서 **`getMe`를 아예 호출하지 않고** `setUser(null)`.
4. `getMe`를 안 부르니 401→refresh 인터셉터도 안 탐 → **유효한 30일 세션인데 로그아웃 상태로 보임.**
5. 결과: 로그인 필요한 CTA/기록카드/글쓰기에서 매일 재로그인 강요.

> 데이터 손실은 없고 "재로그인"만 강요되지만, "한 번 로그인하면 유지" 기대를 깨는 회귀.

**권고(택1, Codex 도메인):**
- **A안(간단·추천):** `setCsrfCookie`의 `maxAge`를 refresh와 맞춰 30일로. 힌트가 세션보다 오래 살아 게이트가 오작동 안 함. (csrf 토큰 자체는 double-submit 검증용이라 수명 길어도 보안 약화 거의 없음 — 어차피 매 요청 서버가 헤더와 쿠키 일치 검증.)
- **B안:** `fetchUser`에서 게이트 전에 `/api/auth/csrf-token`을 한 번 받아 힌트를 갱신한 뒤 판단. (요청 1회 추가)
- 어느 쪽이든 **익명 콘솔 오류 제거 효과는 유지**하면서 재방문 로그인 상태를 보존할 수 있음.

### ③ 대형 파일 분리 (다음 wave)
동의. `CompetitionsPage.tsx`(내 도메인)는 다음 wave에서 `ScheduleCategorySection` / Results·Search 탭 분리 후보. 단, **모바일 탭바 작업과 시점 조율** 필요(둘 다 같은 페이지 구조 건드림). 탭바 범위 PR 낼 때 함께 정리하겠다.

### ④ 2026 도로경기 데이터(id 중복 + kaafSeq/kaafUrl 누락)
데이터 도메인 → Codex. 이번 `stableKey`는 렌더 안정화로 충분. 원천 데이터 보강/표시 정책은 별도 검토에 동의.

---

## 내가 이번에 한 것 (코드)

- `frontend/src/pages/MainPage.tsx`: `formatDdayBadge` 헬퍼 추가 → 홈 진행 중 배지 `DAY N` → `N일차` 표시 보정. (`D-`/`종료` 유지)

## 검증

- 홈 D-day 최종 재검수(KST 수정 반영): live `KAAF배 그린 육상`=3일차, `코리아오픈국제육상`=2일차, next `KTFL`=D-8. 헤더 "지금 열리는 대회". **콘솔 오류 0.**
- `/competitions` 익명 재검수: 콘솔 오류 0, 400+ 응답 0 (Codex 익명-auth 수정 확인).
- `type-check` ✅ / `build` ✅ / 금칙어 0건.

## 남은 것 (Codex)

- ② csrf 힌트 TTL 정합(A안 권고) — 재방문 로그아웃 방지.
- ① 서버 `getDDay` `N일차` 정규화(선택, 권고) — 홈/대회 표기 일원화.

# AthleTime 전면 개편 마스터 플랜 (최종)

> **작성:** 호준(사용자) + Claude 공동 · 갱신 주기: 턴 단위
> **상태:** 4단계 진행 중 (2B/2C/3D/4A/4B 완료, 4C/4D 코드로 이미 해결 확인, 1C/2A/3A/3B/3C 예정)
> **브랜치 정책 (2025 결정):** ✅ **main 단일 브랜치** — 분기 금지. 모든 작업은 main에서 직접 커밋·푸시.
> **커밋 컨벤션:** `ui(1):` / `ui(2):` / `ui(3):` / `ui(4):` (단계별로 독립 커밋)

---

## 0. 배경 (우리가 나눈 대화 전체 요약)

1. **적극적 리뷰 요청** — 다수 사용자 페르소나(보안/사용/공유/집요함/트집/매일 사용/웹 팬, 33개 문서화) 기준 실서비스 공격적 리뷰. 사용자가 repo 공개 전환.
2. **P0 보안 하드닝 완료 (백엔드)** — F4 목록 PII 차단, F1 조회수 dedup, F5 PII 마스킹 로거 + 전 라우트 console→logger 전환. 테스트 28/28. **main 병합·푸시 완료.**
3. **디자인 방향 전환** — "디자인관점이 제일 중요해. 마치 토스처럼" → 기존 디자인 계승 + **토스식 즉각 반응/집중 UX** (문서: `ux-toss-style-motion-interface-plan.md`).
4. **전 페이지 레거시 진단** — 홈/기록은 양호. **몇 달 전 페이지들이 저품질(다크테마 강제, 무지개 하드컬러, inline style, any 타입, 중복 로딩 UI).** "싹 갈아엎을 계획" 필요.
5. **샌드박스 리셋 사건** — 미커밋이던 3건(transition.ts, index.html preload, docs 2건) 휘발 → **재작성 복원**. 교훈: **반드시 즉시 커밋·푸시.**

---

## 1. 목표

- **P0**: 모든 레거시 페이지가 TRAINORACLE 디자인 시스템(라이트 전용)을 준수
- **P1**: 토스식 즉각 반응(M-F-P)이 레거시에도 적용
- **P2**: UX 명세 테스트 97건 실패 회귀 0 유지 + 정합
- **P3**: 운영 안정성(콘솔 PII 미노출, 로그 게이트, ChatPage 준비 상태)

## 2. 4단계 로드맵

### 1단계 — 기반 + 레거시 1호 재작성 (진행 중)
| 항목 | 내용 | 상태 |
|---|---|---|
| 1A | `index.html` 3개 CDN 스타일시트 preload+onload+noscript (렌더차단 해소) | ✅ 완료 — 파일·git 추적 확인 완료 |
| 1B | `transition.ts` — `useNavigateWithTransition()` 폴백 훅 | ✅ 완료 — 파일·git 추적 확인 완료 |
| 1C | **PaceRisePage 재작성** — 다크→라이트, 하드컬러 35건→토큰, inline style 제거, `any` 제거 | 🔄 진행 중 |
| 1D | 프론트 빌드 검증 (`npm run build:check`) → `ui(1):` 커밋·푸시 | ⏳ |

### 2단계 — 레거시 2·3호 + 공용 인프라
| 항목 | 내용 |
|---|---|
| 2A | ScheduleCardPage 재작성 (731줄, 인라인 20·하드컬러 9 — 네이버그린 `#03C75A` 포함) |
| 2B | 공용 Spinner/Skeleton/Button 일원화 — `btn-primary` 34건(d4e476c) + `btn-secondary/danger/ghost/btn` 33건 및 index.css 레거시 `.btn*` 제거(715b1ed) | ✅ 완료 — Button 컴포넌트(variant/size/asChild)로 전면 교체, 잔존 0 |
| 2C | Header 1037줄 축소 (nav·유저 메뉴 리팩터) | ✅ 완료 — 1037→315줄, HeaderLoginModal/HeaderMobileDrawer/HeaderSearchBar 4분할 |

### 3단계 — 운영·정합
| 항목 | 내용 | 상태 |
|---|---|---|
| 3A | ChatPage 준비상태 전환 (실서버 웹소켓 노출 차단 — 채팅이 아닌 "준비 중"으로) | ⏳ |
| 3B | nav 정리 (모바일 탭바 vs 데스크톱 헤더 통일) | ⏳ |
| 3C | 프론트 console 로그 게이트 (44건 — `kDebugMode`/DEV 가드) | ⏳ |
| 3D | UX 명세 97개 테스트 정합 (레코드 워크스페이스 계획 PR #77이 프론트 구현 못 따라간 부분) | ✅ 완료 — 계약 테스트 2건 컴포넌트 정합, 91 fail baseline 유지 |

### 4단계 — 경험 고도화
| 항목 | 내용 | 상태 |
|---|---|---|
| 4A | 홈 → 본인 기록 검색 진입 | ✅ 완료 — 로그인 사용자 nickname "내 기록 검색" 버튼 |
| 4B | 기록 상세 공유 링크 | ✅ 완료 — Web Share API + 클립보드 폴백 + 계약 테스트 |
| 4C | 대회 결과 탭 최신 자동 선택 | ✅ 코드에 이미 해결 — resultsStore period 내림차순 + data[0] 자동선택 (+ 엣지 보강) |
| 4D | CompareTray vs 모바일 탭바 하단 충돌 해결 | ✅ 코드에 이미 해결 — `--mobile-tabbar-height` 변수로 트레이가 탭바 위에 뜨게 설계 |

---

## 3. Progress Tracker (턴 단위 갱신)

| 날짜 | 작업 | 결과 |
|---|---|---|
| 이전 | P0 백엔드 하드닝 F1/F4/F5 + logger 전환 | ✅ 커밋 861a4ea/9f0031b → main 푸시 |
| 이전 | docs 2건(토스·마스터플랜) 작성 | ✅ 이번 재작성 복원 |
| 이전 | 브랜치 통합 | ✅ main FF 병합·푸시 (9f0031b) |
| 이전 | 1A index.html preload / 1B transition.ts | ✅ 완료·커밋됨 (파일·git 추적 확인) |
| 오늘 | 2C Header 4분할 (LoginModal/Drawer/SearchBar) | ✅ 커밋 4f5c938/7570c07/b519a9e/1e45c4b |
| 오늘 | 3D 테스트 정합 2건 | ✅ 커밋 e6aeb2f |
| 오늘 | 4A 홈 본인 기록 검색 진입 | ✅ 커밋 195cf48 |
| 오늘 | 4B 공유 링크 (Web Share + 폴백) | ✅ 커밋 8b86b51 |
| 오늘 | 4C 엣지 보강 + 4D 확인·문서 갱신 | 🔄 진행 중 |
| 다음 | 1C PaceRise 재작성 / 2A ScheduleCard / 2B 공용 UI / 3A~3C | ⏳ |

---

## 4. 핵심 원칙 (회귀 방지)

1. **무조건 즉시 커밋·푸시** — 미커밋 잔고 0. 턴이 끝나면 working tree는 깨끗해야 한다.
2. **main 단일 브랜치** — 분기 금지. PR은 main에서 직접 push로 대체. (기존 PR #78은 main에 이미 병합됨)
3. **디자인 시스템 우선** — 새 코드/재작성은 `tailwind.config.js` 토큰(ink/brand/surface/energy)만 사용. 하드컬러·inline style·`any` 금지.
4. **라이트 모드 전용** — `bg-gray-900` 등 다크 강제 즉시 제거.
5. **폴백 필수** — View Transition, WebSocket, 로컬스토리지 전부 미지원 환경 폴백.
6. **테스트 회귀 0** — 백엔드 335개 중 97 fail은 우리 변경과 무관(스태시 baseline 동일) 확인됨. 신규 변경이 이 수치를 넘게 하지 않는다.

---

*이 문서는 토스 스타일 문서와 쌍을 이룬다. 코드 변경은 반드시 1단계(1C/1D)부터 순차 진행. 사용자 지시 "차근차근 단계별 턴 진행"에 따라 한 턴에 하나의 완결 산출물을 커밋한다.*

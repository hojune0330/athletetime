# AthleteTime 개발 플로우 (총괄 문서)

> 마지막 갱신: 2026-07-14 · 총괄: Claude (Genspark AI Developer)
> 이 문서는 **모든 작업자(Claude/Codex/기타 AI·사람)가 첫 작업 전에 반드시 읽어야 한다.**
> 현재 상태 정본: [`docs/athletetime-current-state.md`](./docs/athletetime-current-state.md) · 후속 작업 인계: [`docs/work-orders/20260714-system-trust-and-stopped-work-handoff.md`](./docs/work-orders/20260714-system-trust-and-stopped-work-handoff.md)

---

## 1. 저장소 역사와 현재 체제

```
[과거]  hojune0330/athletetime        ← 원 서비스 repo
   ↓    (2026 신규 서비스 개편을 위해 핸드오프)
[개편]  hojune0330/2026-first-item    ← 개발/실험 repo (branch: codex/launch-week-ux-trust)
   ↓    (마이그레이션 스냅샷 파이프라인으로 결과물 이관)
[현재]  hojune0330/athletetime        ← 다시 단일 프로덕션 repo로 복귀
```

- `2026-first-item`에서 진행된 핸드오프(신규 레이아웃, card-studio, 커뮤니티 개편,
  대회 볼거리, 신뢰 가드레일 등)는 **전부 athletetime main에 반영 완료**.
- **2026-07-07부터 Codex는 athletetime에 직접 커밋·푸시하되, 기능 브랜치와 PR을 거쳐 `main`에 반영한다** (사용자 지시).
  `2026-first-item`은 과거 기록 보관용이며, 신규 작업을 여기서 시작하지 않는다.

## 2. 배포 아키텍처

| 레이어 | 위치 | 비고 |
|---|---|---|
| 프론트 (React SPA) | Netlify `https://athlete-time.netlify.app` | main 푸시 시 자동 빌드 (`frontend/` → `community/`) |
| 백엔드 (Express+WS) | Render `https://athletetime-backend.onrender.com` | main 푸시 시 자동 배포. `/api/*`는 Netlify가 프록시 |
| 정규 결과 데이터 | `data/results/<year>.json` (2015–2026) | 239개 결과묶음 / 10,086 종목 / 94,195행 |
| 원본 결과 파일 | git-ignored 로컬 (`data/sources/import/originals/`) | 수량은 **비공개 inventory 재확인 필요** — **repo에 올리지 말 것** |

## 3. 작업 규칙 (모든 작업자 공통)

1. **커밋 대상은 athletetime main 기준.** 기능 브랜치 → PR → 머지.
   테스트 전부 통과 + 프론트 빌드 그린이 머지 조건.
2. **테스트 먼저 확인**: `npm test` (계약 테스트 160+개). 새 기능은 계약 테스트를 함께 추가.
3. **신뢰 원칙 (절대 규칙)**:
   - 기록/결과 관련 표현에 공식·인증·검증·랭킹·예측·평가 단어 금지.
   - 사용자에게 보여주는 파생 정보(볼거리 등)는 100% 규칙 기반 — AI 생성 금지.
   - 비공개 요청(마스킹/숨김/삭제)과 qualityHold를 우회하는 코드 금지.
4. **데이터 보호**:
   - 원본 파일(XLS/PDF/HWP)은 절대 커밋하지 않는다 (.gitignore 확인).
   - 실명 데이터 신규 공개 표면(전체 덤프 API, CSV 다운로드 등)을 만들지 않는다.
5. **UI 아이콘은 SVG(heroicons)만.** 이모지를 UI 아이콘으로 쓰지 않는다.
6. **커밋 메시지**: conventional commit (`feat(scope): ...`), 한국어 본문 권장.

추가 운영 기준:

- 프로덕션 mainline 정책은 [`docs/athletetime-production-mainline-policy.md`](./docs/athletetime-production-mainline-policy.md)를 따른다.
- `2026-first-item`에서 가져올 작업은 반드시 [`docs/athletetime-2026-first-item-port-map.md`](./docs/athletetime-2026-first-item-port-map.md)의 분류를 먼저 확인한다.
- 인증/보안, 원본 데이터, 공개 검색, 운영자 기능은 서로 섞어 커밋하지 않는다.
- 기존 작업트리에 dirty 변경이 있으면 clean worktree를 만들어 작업한다.

## 4. 주요 코드 지도

| 영역 | 경로 |
|---|---|
| 프론트 페이지 | `frontend/src/pages/` |
| 대회 결과·볼거리 | `card-studio/routes/resultEventsRoute.js`, `card-studio/services/competitionHighlightsService.js` |
| 결과 데이터 어댑터 | `card-studio/services/resultsStore.js` |
| 비공개/마스킹 정책 | `card-studio/services/dataRequestService.js` |
| 계약 테스트 | `backend/tests/*.test.js` (package.json `test` 스크립트에 등록) |
| 레거시 정규화 증적 | `.omo/evidence/legacy-results-normalization/` |

## 5. 데이터 인프라 로드맵 (합의된 방향)

- **P0**: repo 비공개 전환(사용자 액션), 원본 수량은 비공개 inventory에서 재확인한 뒤 비공개 저장소/스토리지로 백업
- **P1**: 정규 데이터 정적 JSON → Postgres 이전, 공개 검색 API 제한(페이지 20–50건, rate limit)
- **P2**: Turnstile/CAPTCHA, 등급별 접근량, 감사 로그, 약관 고지
- 원칙: **"데이터는 서버 안에, 웹은 필요한 만큼만 물어보는 구조"**

## 6. 진행 중/예정 트랙

- 레거시(2005–2017) 행 단위 정규화: .xls 329개 변환 엔진 필요 (Codex 담당)
- 2026 트랙 시즌 결과 수집 (현재 2026은 로드 6개뿐)
- 훈련 계산기 → TRAINORACLE(`hojune0330/TRAINORACLE`)로 발전 예정.
  현 단계에서는 애타 안에서 가벼운 훈련일지/분석 맛보기로 기대감 조성.

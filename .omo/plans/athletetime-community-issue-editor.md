# AthleteTime Community Magazine

## TL;DR
> **Summary**: 커뮤니티 상단에 `애타 매거진`을 만들고, 드문 대회 주기에 맞춰 출처가 확인되는 육상 이야기를 운영자가 선별·승인해 발행한다. 매일 채우는 뉴스가 아니라 대회 전후와 계절별 종목 흐름을 깊게 읽고 댓글·공유하는 주간형 매거진이다.
> **Deliverables**:
> - 출처·정정·검수 이력을 가진 편집 이슈 데이터 모델
> - 관리자 전용 후보/초안/검수/예약발행 화면
> - `애타 매거진` 공개 피드, 섹션, 상세, 댓글·공유 UX
> - 미성년·오보·저작권·사칭 방지 정책 게이트
> - 기존 QA/테스트 게시물의 가역적 격리 도구
> - 운영 지표와 배포/롤백 런북
> **Effort**: XL
> **Parallel**: YES - 5 waves
> **Critical Path**: 1 -> 2 -> 4 -> 5 -> 6 -> 7 -> 8 -> 10 -> 11 -> F1-F4

## Context
### Original Request
커뮤니티에 육상 이슈를 꾸준히 게시하는 AI형 게시자를 두고, 선수들이 댓글과 공유를 이어가며 네이버 육상 뉴스란처럼 자주 방문하게 만든다.

### Interview Summary
- 공개 브랜드는 `애타 매거진`, 작성자는 `애타 편집팀`으로 한다. `공식`, `AI 검증`, `AI 기자` 표현은 사용하지 않는다.
- AI는 관리자 내부의 후보 탐색·초안 보조·금칙어 점검만 담당한다. 공개 글은 관리자가 검토·승인한 최종본만 발행한다.
- 1차 소재는 국내 공식 결과 파일·일정·AthleteTime 보유 기록이며, 해외는 독립된 1차 출처가 있는 건만 허용한다.
- 기사 전문을 복제하지 않고 사실 요약 + 자체 데이터 맥락 + 원문 링크 + 토론 질문으로 재구성한다.
- 모든 글은 출처와 정정 상태를 표시하고, 미성년·건강·부상·성격·가치평가·예측 소재는 강화된 제한을 적용한다.
- 발행 범위는 시즌 월 6~10건, 비시즌 월 3~5건, 세계·아시아 메이저 기간 월 8~12건이다. 이는 할당량이 아니라 상한을 포함한 운영 범위이며 소재가 약하면 발행하지 않는다.
- 한 대회는 `프리뷰 1건 + 결과와 의미 1건`이 기본이다. 독립적으로 의미 있는 기록이 있을 때만 후속 기록 이야기 1건을 추가한다.
- 계절 축은 겨울 실내·로드/마라톤, 봄 마라톤·시즌 개막, 여름 국내 시즌·국제대회, 가을 전국체전·시즌 결산, 비시즌 아카이브로 나눈다.

### Metis Review (gaps addressed)
- `공식 채널`과 `공식 기록기관` 오인을 피하기 위해 공개 UI에서 `공식`을 금지하고 AthleteTime 소유 편집 채널로만 표현한다.
- 공개 파생 콘텐츠의 AI 생성 금지 원칙과 충돌하지 않도록 AI 결과는 관리자 내부 제안으로만 제한한다.
- 기존 `posts`에 초안을 넣지 않고 별도 편집 테이블에서 관리한 뒤 발행 트랜잭션 시에만 공개 게시물을 만든다.
- 관리자 1인 승인 MVP로 시작하되 작성/승인 행위를 감사 이벤트로 구분한다. 별도 역할 시스템은 후속 범위다.
- 예약 시각은 UTC 저장/KST 입력, 지연된 예약은 서비스 복구 후 즉시 1회 발행하며 DB 잠금으로 중복을 막는다.
- QA 글은 정규식 자동 삭제가 아니라 dry-run -> 관리자 선택 -> 가역 격리 순서로 처리한다.

### Editorial Operating Model
| 기간 | 예상 발행 | 중심 소재 | 금지되는 운영 방식 |
|---|---:|---|---|
| 국내 시즌 | 월 6~10건 | 대회 프리뷰, 결과의 의미, 기록 변화, 다음 대회 연결 | 경기마다 결과표를 기사처럼 복제 |
| 국내 비시즌 | 월 3~5건 | 지난 시즌 결산, 역사 기록, 종목 설명, 팀·훈련 문화, 다음 시즌 일정 | 빈도를 채우기 위한 억지 선수 평가 |
| 세계·아시아 메이저 | 월 8~12건 | 한국 선수 관전 포인트, 공식 결과, 종목 흐름, 대회 후 기록 맥락 | 출처 없는 해외 소문·번역 기사 복제 |
| 겨울·봄 | 월 4~8건 | 실내 시즌, 로드·마라톤, 전지훈련의 공개 정보, 시즌 개막 | 부상·컨디션·심리 추정 |

**대회 1개 편집 단위**
1. 대회 3~7일 전: `이번 대회에서 볼 것` 1건
2. 종료 후 24~72시간: `결과와 그 의미` 1건
3. 별도 기록 가치가 재현될 때만: `기록 이야기` 1건
4. 결과가 평범하거나 출처가 부족하면 2·3번을 생략한다.

`별도 기록 가치`는 다음 중 하나를 충족해야 한다.
- 원출처가 대회/한국/아시아/세계 기록 갱신을 명시한다.
- 동명이인 위험 없이 같은 선수의 출처 있는 과거 기록과 비교해 `N년 만의 개인 최고`를 재현할 수 있다.
- 같은 종목의 장기 추세에서 통계적으로 설명할 변화가 있고 표본·누락 한계를 함께 표시할 수 있다.
- 단순 상위 순서, 운영자의 인상, 선수 인기만으로는 후속 글을 만들지 않는다.

**비시즌 아카이브 단위**
- `그때 그 기록`: 과거 결과와 현재 기록을 출처와 함께 연결
- `종목 읽기`: 규칙·전술·기록 표기법을 중학생도 이해할 길이로 설명
- `팀과 장소`: 공개 자료로 확인되는 팀 역사·훈련지·대회 장소 이야기
- `로드와 실내`: 트랙 시즌 밖 마라톤·경보·실내대회 흐름
- 모든 글은 `왜 지금 읽을 가치가 있는가` 한 문장에 답하지 못하면 발행하지 않는다.

**편집 캘린더 상태**
- `planned`: 날짜/계절 슬롯만 존재
- `candidate_linked`: 출처가 있는 소재 후보 연결
- `drafting`: 편집 중
- `ready`: 정책·출처 검사 통과
- `scheduled`: 예약
- `published|skipped|cancelled`: 최종 결과와 사유 기록
- 빈 슬롯은 `skipped(no-worthy-story)`로 남길 수 있으며 실패로 집계하지 않는다.

## Work Objectives
### Core Objective
사용자가 커뮤니티에 들어오면 10초 안에 `이번 주에 읽을 것`을 발견하고, 출처를 확인한 뒤 댓글·공유·관련 기록 탐색 중 하나를 수행할 수 있게 한다.

### Deliverables
- `editorial_issues`, `editorial_sources`, `editorial_revisions`, `editorial_events`, `editorial_calendar`, `magazine_digest_preferences`, `event_alert_subscriptions`, `issue_engagement_daily`, `post_quarantines` 스키마와 롤백
- 편집 상태 머신과 관리자 API/화면
- 출처 등급·금칙어·미성년·중복 검사기
- 공개 이슈 카드/탭/상세/정정 이력/관련 기록 링크
- 인앱 팔로우 알림과 익명 집계형 공유 계측
- 운영자용 발행·정정·격리·롤백 문서

### Definition of Done
- root `npm test`, `npm --prefix frontend run type-check`, `npm --prefix frontend run build`가 모두 통과한다.
- PostgreSQL 마이그레이션 up/down 테스트와 예약발행 동시성 테스트가 통과한다.
- 관리자 아닌 사용자는 초안·승인·예약·정정 API에 접근할 수 없다.
- 출처 1개 미만, 금칙어, 미성년 고위험 소재, 중복 fingerprint 글은 발행이 차단된다.
- `/community`와 `/community/magazine` 모바일/데스크톱 실제 브라우저 QA에서 콘솔 오류 0, 출처·댓글·공유·정정 링크가 모두 동작한다.
- 프로덕션 데이터 격리는 승인 목록만 반영되고 복원 테스트가 성공한다.

### Must Have
- 모든 편집 글에 원출처 제공자·제목·URL·접근시각·출처종류 저장
- 공개 글에 `출처 기반`, 원문 링크, 마지막 수정시각, 정정 상태 표시
- 서버에서 관리자 권한·CSRF·상태 전이를 재검증
- 공개 게시물은 기존 댓글·추천·공유 구조와 호환
- 인앱 알림은 명시적 팔로우 사용자에게만 생성

**Hard publish blockers**
- 확인 가능한 출처 1개 미만 또는 허용되지 않은 출처 등급
- 동일 fingerprint 30일 내 중복 또는 한 대회 2+1 상한 초과
- `why_now`, 사실 요약, 토론 질문, 관련 링크 중 필수 필드 누락
- 미성년 평가·예측, 건강/부상/심리 추정, 기사 전문·무허가 이미지
- 동명이인 가능성이 해소되지 않은 개인 기록 연결
- `공식/인증/AI 검증/랭킹/유망주 순위` 등 금칙어

**Season calculation**
- 고정 월이 아니라 캘린더 데이터로 판단한다: 해당 월 국내 승인 대회 2개 이상이면 `domestic-season`, 0~1개면 `off-season`.
- 세계·아시아 메이저 기간은 `major-window`, 실내·로드/마라톤은 겹칠 수 있는 overlay tag로 둔다.
- 발행 범위 미달은 오류가 아니다. hard blocker 또는 편집 가치 부족 시 `skipped(quality_gate_no_publish)`를 정상 상태로 기록한다.

### Must NOT Have
- AI가 사람인 척하는 프로필, 무검수 자동발행, `공식/인증/검증/랭킹/예측/평가` 오인 문구
- 기사 본문·사진의 무단 복제, 출처 없는 해외 이슈, 검색 차단 우회 수집
- 미성년의 외모·가치·부진·심리·건강·부상 추정 또는 자극적 줄세우기
- 이름만으로 동명이인 기록 결합, 개인 식별자·원문 전문·원본 비공개 파일의 공개 저장
- 정규식만으로 프로덕션 게시글 자동 삭제

## Risk Register
| 위험 | 수준 | 예방책 | 즉시 중단 조건 |
|---|---|---|---|
| 소재 고갈로 억지 발행 | Critical | 발행 범위는 quota가 아니며 `quality_gate_no_publish`를 정상 처리 | `why_now` 없는 글 또는 한 대회 2+1 초과 |
| 기사 저작권·사진 재사용 | Critical | 사실만 재서술, 원문 링크, 전문/사진 저장 금지, source allowlist | 원문 문장 대량 중복 또는 사용권 불명 이미지 |
| AI 환각·책임 주체 혼란 | High | MVP AI provider 미연결, 공개본은 운영자 수동 작성·승인 | AI 결과가 source처럼 저장되거나 자동발행됨 |
| 미성년·동명이인 명예 침해 | Critical | 보수적 minor flag, identity ambiguity blocker, 평가·추정 금지 | 학교부 개인에 대한 부진·가치·건강·심리 주장 |
| 공식 기관으로 오인 | High | `애타 매거진/애타 편집팀/출처 기반` 카피 계약 | 공개 UI에 공식·인증·AI 검증·공식 랭킹 표현 |
| 댓글 집단 반응·선수 공격 | High | 첫 2시간 추천 수 숨김, 신고/블라인드, 토론 질문 중립화 | 특정 선수 비난이 반복되고 moderation SLA 초과 |
| 예약 중복·부분 발행 | High | DB transaction, `SKIP LOCKED`, idempotency, retry/failed 상태 | post/source/notification 일부만 반영됨 |
| 알림 피로 | Medium | 주간 opt-in digest, 글별 알림 금지, 메이저 alert 별도 opt-in | 구독 해제 후 알림 또는 주 1회 초과 |
| 기존 테스트 글 신뢰 훼손 | Medium | dry-run·백업·승인 ID만 가역 격리 | 정규식 자동 삭제 또는 댓글 있는 글 무승인 처리 |
| 시스템 과대구축 | High | MVP는 Task 1~8,10,11만; 4주 공급 검증 후 Task 9,12 | 4주간 품질 통과 발행 3건 미만인데 retention 개발 진행 |

**4주 파일럿 통과 기준**
- hard blocker 위반 0건, 출처 누락 0건, 중복 발행 0건
- 최소 3건의 품질 통과 글을 운영자가 무리 없이 발행; 상한/하한 미달 자체는 실패가 아님
- 정정이 발생하면 24시간 내 revision 공개, 미처리 신고 48시간 초과 0건
- 운영자 1건당 후보 확인~승인 중앙값 45분 이하
- 위 조건 미달 시 Task 9·12를 진행하지 않고 정책/편집실부터 개선한다.

## Verification Strategy
> ZERO HUMAN INTERVENTION - 구현 검증은 에이전트가 실행하고, 프로덕션 발행/격리 승격만 관리자 승인 게이트를 둔다.
- Test decision: TDD + Node test contracts + PostgreSQL integration + frontend type/build + Playwright
- QA policy: 각 작업은 happy/failure 시나리오와 증거 파일을 남긴다.
- Evidence: `.omo/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: 1 정책 계약, 2 DB/상태 머신, 3 프로덕션 데이터 격리 dry-run
Wave 2: 4 편집 도메인/API, 5 소재 후보·검사기, 6 관리자 편집실
Wave 3: 7 공개 매거진 IA, 8 상세·댓글·공유
Wave 4 (MVP 후보): 10 예약발행·정정·운영 런북, 11 기존 데이터 격리 승격
Gate A: F1-F4를 MVP 범위로 실행한 뒤 4주 편집 파일럿 시작
Wave 5 (파일럿 통과 후): 9 주간 다이제스트·알림, 12 관측·대시보드 고도화
Gate B: F1-F4를 전체 범위로 재실행한 뒤 retention 기능 활성화

### Dependency Matrix
| Task | Blocked By | Blocks |
|---|---|---|
| 1 | - | 4,5,6,7,8,10 |
| 2 | - | 4,6,8,9,10,11 |
| 3 | - | 11 |
| 4 | 1,2 | 5,6,8,9,10 |
| 5 | 1,4 | 6,10 |
| 6 | 1,2,4,5 | 10 |
| 7 | 1 | 8,9 |
| 8 | 1,2,4,7 | 9,12 |
| 9 | 2,4,7,8 | 12 |
| 10 | 1,2,4,5,6 | F1-F4 |
| 11 | 2,3 | F1-F4 |
| 12 | 8,9 | F1-F4 |

## TODOs

- [x] 1. 매거진 편집 정책·계절 캘린더·공개 카피 계약 고정

  **What to do**: `애타 매거진` 정체성, 섹션 6종(`이번 대회`, `기록 이야기`, `국제`, `로드·마라톤`, `실내`, `아카이브`), 계절별 발행 범위, 대회 1개당 2+1 편집 규칙, 출처 등급, AI 내부 보조 범위, 미성년·민감 소재, 금칙어, 정정·내림 절차를 단일 정책 모듈과 문서로 만든다. 공개 카피는 `애타 편집팀`, `출처 기반`, `운영자가 확인해 정리했어요`로 고정한다.
  **Must NOT do**: `공식`, `AI 기자`, `AI 검증`, 선수 평가·예측·부상 추정 표현을 허용하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,6,7,8,10 | Blocked By: none

  **References**:
  - `WORKFLOW.md:34` - 기록/결과 신뢰 원칙과 공개 파생 콘텐츠 경계
  - `frontend/src/config/dataPolicy.ts:183` - 미성년 공유·노출 기준
  - `docs/athletetime-records-microcopy.md:80` - 금지어와 대체 표현
  - `docs/athletetime-production-mainline-policy.md:62` - 출처·정정 절차
  - External: `https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/` - 사람 편집·검수 원칙

  **Acceptance Criteria**:
  - [x] 허용/차단 fixture 각각 20건 이상을 정책 테스트가 판정한다.
  - [x] 공개 UI/템플릿 전체 금칙어 스캔이 0건이다.

  **QA Scenarios**:
  ```
  Scenario: 출처 있는 성인 경기결과 이슈
    Tool: node --test
    Steps: KAAF 결과 URL, 날짜, 기록, 중립 제목 fixture를 검사한다.
    Expected: publishEligible=true, 필요한 공개 카피가 생성된다.
    Evidence: .omo/evidence/task-1-policy-happy.txt

  Scenario: 미성년 부진·부상 추정 제목
    Tool: node --test
    Steps: 학교부 선수와 "부진/부상인 듯/유망주 순위" 문구를 검사한다.
    Expected: publishEligible=false와 구체적 차단 사유가 반환된다.
    Evidence: .omo/evidence/task-1-policy-blocked.txt
  ```

  **Commit**: YES | Message: `docs(policy): define community editorial trust contract` | Files: `docs/athletetime-community-editorial-policy.md`, `card-studio/editorialPolicy.js`, `backend/tests/community-editorial-policy.test.js`, `package.json`

- [x] 2. 편집 이슈·출처·감사·격리 스키마와 상태 머신 구축

  **What to do**: 공개 `posts`와 초안을 분리한다. `editorial_calendar`는 `planned|candidate_linked|drafting|ready|scheduled|published|skipped|cancelled`, 계절/대회/`section_key`/슬롯/skip 사유를 관리하고, `editorial_issues`는 `draft -> review_ready -> approved -> scheduled|published -> corrected|unpublished` 전이를 관리한다. 대회 패키지는 `competition_id + package_role(preview|result_context|record_story)` unique 규칙으로 2+1 상한을 적용한다. `editorial_sources`, `editorial_revisions`, `editorial_events`, `magazine_digest_preferences`, `event_alert_subscriptions`, `issue_engagement_daily`, `post_quarantines`를 추가한다. 초안은 `post_id=NULL`, 발행 트랜잭션에서만 `posts` 행을 만든다. KST 입력을 UTC로 저장한다.
  **Must NOT do**: 기존 `posts` 응답을 깨거나 초안·검수 메모를 공개 쿼리에 노출하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,6,8,9,10,11 | Blocked By: none

  **References**:
  - `backend/database/schema.sql:75` - 기존 posts 호환 계약
  - `backend/database/schema.sql:245` - notifications 구조
  - `backend/database/run-migrations.js:12` - migration 실행 패턴
  - `backend/database/migration-004-data-rights.sql:1` - 감사 가능한 신규 테이블 패턴

  **Acceptance Criteria**:
  - [x] up/down migration을 빈 DB와 기존 fixture DB에서 반복 실행해 무손실이다.
  - [x] 허용되지 않은 상태 전이는 DB/service 양쪽에서 거부된다.
  - [x] draft API 결과가 기존 `/api/posts` 목록에 나타나지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 승인된 이슈 1회 발행
    Tool: node --test + PostgreSQL
    Steps: draft 생성, source 추가, 승인, publish를 실행한다.
    Expected: editorial issue와 post가 1:1 연결되고 감사 이벤트가 순서대로 남는다.
    Evidence: .omo/evidence/task-2-state-machine.txt

  Scenario: draft에서 published로 건너뛰기
    Tool: node --test + PostgreSQL
    Steps: 검수·승인 없이 publish 전이를 호출한다.
    Expected: 409 INVALID_EDITORIAL_TRANSITION, posts 행 0개다.
    Evidence: .omo/evidence/task-2-invalid-transition.txt
  ```

  **Commit**: YES | Message: `feat(editorial): add issue workflow schema` | Files: `backend/database/migration-006-community-editorial.sql`, `backend/database/rollbacks/006-community-editorial-down.sql`, `card-studio/repositories/*Editorial*`, `backend/tests/community-editorial-postgres.integration.test.js`

- [x] 3. 기존 QA/테스트 게시물 가역 격리 도구 만들기

  **What to do**: 프로덕션 게시글을 제목 정규식으로 바로 처리하지 않고 후보 리포트를 만든다. seed ID/작성자/생성시각/제목/본문 요약/조회·댓글 수를 출력하고 관리자가 선택한 ID만 `post_quarantines`에 넣는다. 복원 명령과 사전 백업 체크를 제공한다.
  **Must NOT do**: 자동 삭제, ID 추정, 댓글이 있는 글의 무승인 격리를 하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 11 | Blocked By: none

  **References**:
  - `backend/database/seed.js:356` - 테스트 데이터 생성 근거
  - `backend/routes/posts.js:23` - 공개 목록 필터 적용 위치
  - `backend/database/schema.sql:218` - 기존 moderation 데이터 패턴

  **Acceptance Criteria**:
  - [x] 기본 실행은 dry-run이며 DB를 변경하지 않는다.
  - [x] 승인 목록 외 post ID의 visibility가 변하지 않는다.
  - [x] quarantine/recover 왕복 후 게시글·댓글·카운터가 동일하다.

  **QA Scenarios**:
  ```
  Scenario: 후보 리포트만 생성
    Tool: npm script + test DB
    Steps: QA fixture 5개와 일반글 5개로 dry-run한다.
    Expected: 후보만 JSON/MD에 나오고 DB diff는 0이다.
    Evidence: .omo/evidence/task-3-quarantine-dry-run.md

  Scenario: 잘못된 승인 ID
    Tool: npm script
    Steps: 존재하지 않는 ID와 댓글 있는 ID를 승인 파일에 넣는다.
    Expected: 전체 작업이 중단되고 부분 반영이 없다.
    Evidence: .omo/evidence/task-3-quarantine-reject.txt
  ```

  **Commit**: YES | Message: `feat(community): add reversible post quarantine` | Files: `scripts/community-post-quarantine.js`, `backend/tests/community-post-quarantine.test.js`, `docs/runbooks/community-post-quarantine.md`

- [x] 4. 관리자 전용 편집 도메인 API 구현

  **What to do**: `/api/admin/editorial/calendar`, `/api/admin/editorial/issues`, `/api/admin/editorial/issues/:id/{check|approve|reject|schedule|cancel|publish|correct|unpublish}`와 source CRUD를 별도 라우터에 구현한다. 공개 읽기는 `/api/editorial/magazine`, `/api/editorial/magazine/:slug`로 분리한다. 모든 admin write는 `authenticateToken + requireAdmin + CSRF`, 전용 parse 함수의 구조화 검증, 낙관적 version, 감사 actor/event를 사용한다. Source URL은 `https`만 허용하고 사설 IP·credential·redirect SSRF를 차단한다.
  **Must NOT do**: 일반 `/api/posts`의 `optionalAuth` 경로로 편집 권한을 우회하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6,8,9,10 | Blocked By: 1,2

  **References**:
  - `backend/routes/posts.js:308` - 기존 post 생성 및 호환 필드
  - `backend/middleware/auth.js:24` - 인증/관리자 미들웨어
  - `backend/utils/authCookies.js:136` - CSRF 계약
  - `card-studio/routes/adminRoutes.js:359` - 관리자 preview/generate 라우트 패턴

  **Acceptance Criteria**:
  - [x] admin happy path와 anonymous/non-admin/CSRF 없음/version 충돌 테스트가 모두 통과한다.
  - [x] 응답에 내부 prompt, 원문 전문, 감사 IP, 비밀 설정이 포함되지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 관리자 초안 승인
    Tool: curl + real auth cookies/CSRF
    Steps: draft, source, check, approve 요청을 순서대로 보낸다.
    Expected: 201/200, version 증가, 감사 이벤트 4개가 기록된다.
    Evidence: .omo/evidence/task-4-admin-api.json

  Scenario: 일반 사용자의 publish 시도
    Tool: curl
    Steps: 일반 계정 쿠키로 publish endpoint를 호출한다.
    Expected: 403, 상태·post·event 변화 0이다.
    Evidence: .omo/evidence/task-4-forbidden.json
  ```

  **Commit**: YES | Message: `feat(editorial): add admin issue workflow api` | Files: `backend/routes/editorialAdmin.js`, `card-studio/services/editorialIssueService.js`, `src/server.js`, `backend/tests/community-editorial-api.test.js`

- [ ] 5. 소재 후보 탐색·중복·출처 검사기 구현

  **What to do**: 기존 대회 일정, 정규화 결과, 기록 통계에서 계절·섹션별 발행 후보를 만들되 공개 문장을 직접 발행하지 않는다. 후보는 `why_now`, fact payload, source refs, 관련 선수/대회 링크, deterministic fingerprint를 가진다. 한 대회에서 프리뷰/결과/기록 후속 상한을 검사하고, 아카이브 후보는 현재 일정·기념일·기록 변화와 연결될 때만 우선한다. MVP는 수동 캘린더 + 규칙 기반 후보만 구현한다. AI는 4주 파일럿 후 별도 승인 전까지 provider/API를 연결하지 않고 인터페이스 문서만 남긴다.
  **Must NOT do**: 웹 차단 우회, 기사 전문 저장, AI 결과를 사실 근거로 사용, 자동 publish를 하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,10 | Blocked By: 1,4

  **References**:
  - `card-studio/services/recordAnalyticsService.js` - 보유 기록 기반 계산 패턴
  - `card-studio/services/sourceDownloadService.js:159` - 출처 실패 구조
  - `docs/athletetime-athlete-history-web-playbook.md:443` - 해외 독립 출처 재확인
  - `card-studio/services/manualTopRecordReviewPolicy.js:12` - 해외 후보 식별 규칙

  **Acceptance Criteria**:
  - [ ] 동일 사실 fingerprint는 30일 내 중복 후보를 만들지 않고, 대회별 2+1 상한을 적용한다.
  - [ ] `why_now`가 비어 있거나 품질점수 기준 미만이면 캘린더 슬롯을 skipped로 종료할 수 있다.
  - [ ] 외부 AI provider 없이 후보 생성·정책 검사·수동 편집이 완전 동작한다.
  - [ ] source allowlist 밖 URL은 review-only이며 승인 불가다.

  **QA Scenarios**:
  ```
  Scenario: 시즌 대회 결과에서 기록 변화 후보 생성
    Tool: node --test
    Steps: 출처가 있는 성인 100m 결과 fixture를 입력한다.
    Expected: fact payload와 관련 기록 URL이 생기고 공개 post는 생성되지 않는다.
    Evidence: .omo/evidence/task-5-candidate.txt

  Scenario: 같은 결과 재입력과 출처 없는 해외 이슈
    Tool: node --test
    Steps: 동일 fixture 두 번, source 없는 해외 fixture 한 번을 넣는다.
    Expected: duplicate와 source_ineligible로 각각 차단된다.
    Evidence: .omo/evidence/task-5-candidate-blocked.txt
  ```

  **Commit**: YES | Message: `feat(editorial): generate source-backed issue candidates` | Files: `card-studio/services/editorialCandidateService.js`, `card-studio/services/editorialSourcePolicy.js`, `backend/tests/community-editorial-candidates.test.js`

- [ ] 6. 관리자 `매거진 편집실` 화면 구축

  **What to do**: `/admin/content/magazine`에 월간 캘린더와 후보, 초안, 검수대기, 예약, 발행, 정정 탭을 만든다. 캘린더는 국내 시즌·국제 메이저·실내·로드/마라톤·아카이브 슬롯과 `발행하지 않음` 결정을 모두 보여준다. source card, `why_now`, 사실 필드, 공개 미리보기, 정책 실패, sensitivity, 관련 링크, 일정(KST), revision diff를 표시한다. 승인 버튼은 모든 blocking check가 green일 때만 활성화한다. MVP에는 AI 제안 UI/provider 호출을 넣지 않고 수동 편집만 제공한다.
  **Must NOT do**: source 없이 승인, 공개 문장과 내부 메모 혼합, 관리자 이외 접근을 허용하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10 | Blocked By: 1,2,4,5

  **References**:
  - `frontend/src/pages/admin/AdminContentPage.tsx:1` - 기존 콘텐츠 관리 진입점
  - `frontend/src/api/admin.ts:143` - 관리자 API wrapper 패턴
  - `frontend/src/pages/admin/AdminPipelinePage.tsx:27` - 상태/실행 UI 패턴
  - `frontend/src/App.tsx:143` - route/lazy loading 패턴

  **Acceptance Criteria**:
  - [ ] 키보드만으로 후보 선택부터 예약까지 완료할 수 있다.
  - [ ] 실패 check는 원인과 수정 위치를 한 문장으로 표시한다.
  - [ ] 새로고침 후 draft/version/source/revision이 보존된다.

  **QA Scenarios**:
  ```
  Scenario: 대회 프리뷰를 편집해 금요일 18:00 KST 예약
    Tool: Playwright
    Steps: 관리자 로그인, 후보 선택, 제목/질문 편집, source 확인, 승인, 예약한다.
    Expected: 캘린더와 예약 탭에 UTC 변환된 금요일 18:00 KST와 version이 보인다.
    Evidence: .omo/evidence/task-6-editor-room.png

  Scenario: source 제거 후 승인
    Tool: Playwright
    Steps: source를 모두 제거하고 승인 버튼을 확인한다.
    Expected: 버튼 disabled, "출처를 1개 이상 확인해 주세요"가 보인다.
    Evidence: .omo/evidence/task-6-source-required.png
  ```

  **Commit**: YES | Message: `feat(admin): add athletics issue editor room` | Files: `frontend/src/pages/admin/AdminIssueEditorPage.tsx`, `frontend/src/components/admin/editorial/*`, `frontend/src/api/editorialAdmin.ts`, `frontend/src/App.tsx`

- [ ] 7. 커뮤니티 정보구조를 `매거진 + 사람 글` 이중 표면으로 개편

  **What to do**: `/community` 상단을 `이번 주에 읽을 것` 1건 + `최근 발행` 4건 + 기존 인기글/게시판으로 구성하고 `/community/magazine` 전용 목록을 추가한다. 탭에는 `매거진`을 `전체글` 다음에 배치하고 섹션 필터(`이번 대회`, `기록 이야기`, `국제`, `로드·마라톤`, `실내`, `아카이브`)를 둔다. 카드는 제목, 2줄 요약, section, source provider, 발행일, 예상 읽기 시간, 댓글 수만 보여준다. 새 글이 없는 주에는 마지막 좋은 글을 유지하되 `새 소식`처럼 가장하지 않는다. 데이터가 없으면 기존 커뮤니티가 그대로 첫 화면이 된다.
  **Must NOT do**: 일반 사용자 글을 숨기거나 보조 기능 1차 네비를 늘리지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8,9 | Blocked By: 1

  **References**:
  - `frontend/src/pages/CommunityPage.tsx:31` - 현재 커뮤니티 조합
  - `frontend/src/components/community/CommunityBestStrip.tsx:150` - 인기글 strip
  - `frontend/src/components/community/CommunityBoardTabs.tsx:17` - 게시판 탭
  - `frontend/src/components/post/PostList.tsx:248` - 기존 밀도 높은 행

  **Acceptance Criteria**:
  - [ ] 매거진 글 존재 시 390px 첫 viewport 안에 `이번 주에 읽을 것`과 댓글 CTA가 보인다.
  - [ ] 14일 이상 새 글이 없어도 오래된 글을 `오늘/방금`으로 표시하지 않는다.
  - [ ] 이슈 0건/API 실패 시 기존 게시판과 글쓰기가 정상 작동한다.
  - [ ] 공개 화면에 `공식`, `AI 검증`, `랭킹` 표현이 없다.

  **QA Scenarios**:
  ```
  Scenario: 이번 주 매거진 글이 있는 모바일 커뮤니티
    Tool: Playwright 390x844
    Steps: /community 접속, 이번 주 글과 매거진 탭을 연다.
    Expected: source label, 제목, 질문 CTA가 첫 화면에 있고 가로 넘침이 없다.
    Evidence: .omo/evidence/task-7-community-mobile.png

  Scenario: 이슈 API 500
    Tool: Playwright route fault
    Steps: 이슈 API만 500으로 만들고 /community를 연다.
    Expected: 일반 인기글·게시판·글쓰기가 유지되고 콘솔 uncaught error 0이다.
    Evidence: .omo/evidence/task-7-graceful-fallback.png
  ```

  **Commit**: YES | Message: `feat(community): surface athletics magazine` | Files: `frontend/src/pages/CommunityPage.tsx`, `frontend/src/pages/CommunityMagazinePage.tsx`, `frontend/src/components/community/MagazineLead.tsx`, `frontend/src/components/community/MagazineList.tsx`, `frontend/src/App.tsx`

- [ ] 8. 매거진 상세에 출처·관련 기록·댓글·공유·정정 루프 연결

  **What to do**: 기존 PostDetail을 호환 확장해 편집 글이면 요약, 확인된 사실, 관련 기록/대회 링크, 원출처, 한 개의 토론 질문, correction history를 표시한다. 공유는 Web Share/clipboard에 제목+짧은 요약+URL을 넣고 성공 후 익명 집계 이벤트를 보낸다. 공개 2시간 동안 추천/비추천 숫자는 숨기되 버튼과 댓글은 유지한다. 편집 글의 수정/삭제은 일반 비밀번호 UI 대신 관리자 워크플로로 보낸다.
  **Must NOT do**: 원문 전문, 무허가 이미지, 내부 검수 메모, 공개 share user identifier를 노출하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 9,12 | Blocked By: 1,2,4,7

  **References**:
  - `frontend/src/pages/PostDetailPage.tsx:245` - Web Share/clipboard fallback
  - `frontend/src/pages/PostDetailPage.tsx:298` - 기존 공유 액션
  - `backend/routes/comments.js:23` - 댓글 작성/반환
  - `backend/routes/votes.js:22` - 추천 토글
  - External: `https://support.reddithelp.com/hc/en-us/articles/204511579-Why-can-t-I-see-how-many-upvotes-a-post-or-comment-has-sometimes` - 초기 사회적 신호 완화

  **Acceptance Criteria**:
  - [ ] editorial/non-editorial 상세가 동일 route에서 회귀 없이 렌더링된다.
  - [ ] 정정 이력이 있으면 배지와 변경시각/요약이 공개된다.
  - [ ] 2시간 전후 count visibility 경계 테스트가 통과한다.

  **QA Scenarios**:
  ```
  Scenario: 이슈를 읽고 댓글·공유
    Tool: Playwright
    Steps: source 열기, 관련 기록 열기, 댓글 작성, 공유 버튼을 누른다.
    Expected: 각 링크가 새 안전 탭/내부 route로 열리고 댓글 증가, 공유 성공 안내가 보인다.
    Evidence: .omo/evidence/task-8-issue-detail.png

  Scenario: 정정된 미성년 관련 이슈
    Tool: Playwright
    Steps: corrected fixture를 연다.
    Expected: 정정 배지와 이력이 보이고 추천 숫자는 초기 구간에 숨겨진다.
    Evidence: .omo/evidence/task-8-correction-minor.png
  ```

  **Commit**: YES | Message: `feat(community): connect issue discussion and sharing` | Files: `frontend/src/pages/PostDetailPage.tsx`, `frontend/src/components/editorial/*`, `frontend/src/types/index.ts`, `frontend/src/api/posts.ts`, `backend/routes/posts.js`

- [ ] 9. 주간 다이제스트·메이저 대회 알림·개인정보 최소 집계 구현

  **What to do**: `/api/magazine/preferences/digest`, `/api/magazine/preferences/events`, `/api/admin/editorial/digests/{preview|approve|send}`를 구현한다. 로그인 사용자가 명시적으로 `주간 매거진 모아보기`를 구독/해제하게 한다. 다이제스트는 매주 월요일 18:00 KST cutoff, 최대 5건, 관리자 preview/approve 후 인앱 알림 1개로 발행한다. 글마다 알림을 보내지 않는다. 세계·아시아 메이저와 사용자가 직접 선택한 대회만 별도 alert opt-in을 허용한다. 공유·source open·comment start는 회전 HMAC 익명키로 일별 1회 dedupe 후 30일 내 원시 이벤트를 집계·삭제한다. 이메일·푸시는 이번 범위에서 제외한다.
  **Must NOT do**: 자동 구독, 글별 알림 폭탄, 선수 이름 자동 팔로우, raw IP/user-agent/검색어 장기 저장을 하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 12 | Blocked By: 2,4,7,8, Gate A 4주 파일럿

  **References**:
  - `backend/database/schema.sql:245` - 기존 notifications 계약
  - `frontend/src/config/constants.ts:167` - 알림 API 상수
  - `backend/utils/websocket.js` - 실시간 보조 채널
  - `docs/athletetime-auth-privacy-security-contract.md:20` - 인증·개인정보 경계

  **Acceptance Criteria**:
  - [ ] 명시적 digest 구독자에게만 주 1개 알림이 생성되고 같은 주 재실행은 dedupe된다.
  - [ ] 메이저 대회 alert는 해당 대회를 선택한 사용자에게만 생성된다.
  - [ ] unsubscribe 이후 신규 알림 0개이며 기존 알림은 유지된다.
  - [ ] 집계 테이블에서 raw IP, UA, 평문 user/session ID가 검출되지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 주간 다이제스트 구독 후 3건 발행
    Tool: node --test + Playwright
    Steps: 구독, 한 주에 글 3건 발행, 월요일 다이제스트 승인, 알림 열기/읽음을 수행한다.
    Expected: 알림 1개에 3건이 묶이고 링크·읽음 상태가 지속된다.
    Evidence: .omo/evidence/task-9-follow-notification.png

  Scenario: 비로그인 구독과 다이제스트 재전송
    Tool: curl
    Steps: 익명 subscribe 요청, 같은 주 digest job 2회, 동일 share 이벤트 20회를 전송한다.
    Expected: subscribe는 401, digest는 1개, 일별 share aggregate는 1 증가한다.
    Evidence: .omo/evidence/task-9-abuse.json
  ```

  **Commit**: YES | Message: `feat(editorial): add issue follows and private metrics` | Files: `backend/routes/editorialPublic.js`, `card-studio/services/editorialNotificationService.js`, `frontend/src/components/editorial/IssueFollowButton.tsx`, `frontend/src/api/editorial.ts`, `backend/tests/community-editorial-notifications.test.js`

- [ ] 10. 동시성 안전 예약발행·정정·내림 운영 구현

  **What to do**: 백엔드 scheduler가 60초마다 due rows를 `FOR UPDATE SKIP LOCKED`로 가져와 발행한다. UTC 저장/KST 표시, restart 후 overdue 즉시 처리, retry 3회 exponential backoff, 이후 `publish_failed`와 관리자 알림을 남긴다. correction은 revision을 추가하고 공개 post를 transaction으로 갱신하며, unpublish는 공개 목록에서 내리되 감사/원본은 보존한다.
  **Must NOT do**: in-memory timer만 믿기, 실패를 published로 표시, 정정 이력 삭제를 하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 1,2,4,5,6

  **References**:
  - `card-studio/services/autoGenerateQueue.js` - 기존 queue lifecycle
  - `card-studio/services/historyManager.js:63` - 생성 이력 패턴
  - `backend/routes/posts.js:761` - soft delete/admin action 패턴
  - `docs/data-privacy-guardrails.md:40` - 정정·내림 경로

  **Acceptance Criteria**:
  - [ ] scheduler 인스턴스 2개 동시 실행에도 post가 정확히 1개 생성된다.
  - [ ] downtime 중 지난 예약은 복구 후 1회 발행된다.
  - [ ] correction/unpublish 후 캐시·목록·상세가 일관된다.

  **QA Scenarios**:
  ```
  Scenario: 동시 예약발행
    Tool: node --test + PostgreSQL
    Steps: 같은 DB에 worker 2개를 띄우고 due issue 10개를 처리한다.
    Expected: posts 10개, 중복 0, issue마다 published event 1개다.
    Evidence: .omo/evidence/task-10-scheduler-concurrency.txt

  Scenario: 발행 중 DB 오류
    Tool: integration fault injection
    Steps: post insert 뒤 transaction 실패를 주입한다.
    Expected: post/notification 부분 반영 0, retry 후 publish_failed와 관리자 경고가 남는다.
    Evidence: .omo/evidence/task-10-scheduler-failure.txt
  ```

  **Commit**: YES | Message: `feat(editorial): schedule and correct issue posts safely` | Files: `card-studio/services/editorialScheduler.js`, `card-studio/services/editorialIssueService.js`, `src/server.js`, `backend/tests/community-editorial-scheduler.integration.test.js`, `docs/runbooks/editorial-publishing.md`

- [ ] 11. 승인된 프로덕션 QA 게시물 격리 및 복원 리허설

  **What to do**: 배포 직전 DB 백업을 확인하고 Task 3 dry-run 리포트를 관리자에게 제시한다. 승인된 ID만 quarantine하고 공개 `/community`, 인기글, 검색에서 제외되는지 확인한다. 별도 test DB에서 전량 복원 후 원래 카운터/댓글과 hash가 같은지 검증한다.
  **Must NOT do**: 승인 없는 승격, hard delete, 제목만 보고 일괄 처리하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 2,3

  **References**:
  - `scripts/community-post-quarantine.js` - Task 3 산출물
  - `docs/runbooks/community-post-quarantine.md` - 승인/복원 순서
  - Live baseline: `/community`의 `Test`, `투표테스트`, `QA 테스트`, `제목 없음` 등은 후보일 뿐 자동 확정 대상이 아님

  **Acceptance Criteria**:
  - [ ] 승인 목록/백업 ID/실행 actor/timestamp가 evidence에 남는다.
  - [ ] 일반 게시글 row count와 전체 comment count가 불변이다.
  - [ ] 복원 리허설의 checksum이 격리 전과 같다.

  **QA Scenarios**:
  ```
  Scenario: 승인된 3개 QA 글 격리
    Tool: runbook + Playwright
    Steps: 승인 파일로 적용 후 목록/직접 URL/인기글을 확인한다.
    Expected: 3개만 비공개, 관리자 화면에서는 격리 사유와 복원 버튼이 보인다.
    Evidence: .omo/evidence/task-11-production-quarantine.md

  Scenario: 복원 리허설
    Tool: PostgreSQL restore script
    Steps: 백업 clone에서 3개를 복원한다.
    Expected: post/content/comments/counters checksum 동일이다.
    Evidence: .omo/evidence/task-11-restore-rehearsal.txt
  ```

  **Commit**: NO | Files: production operation evidence only

- [ ] 12. 운영 대시보드·발행 품질 지표·4주 판단 기준 추가

  **What to do**: 관리자에 발행/skip 사유, 시즌 범위 대비 실제 발행(미달 페널티 없음), 대회글/아카이브/국제/로드·실내 구성, source 분포, 정정률, 차단 사유, magazine open, 읽기 완료 추정, source open, comment start/completed, share, digest subscribe/open, event alert opt-in, 7일·28일 재방문을 주간 집계로 보여준다. 성장 목표보다 출처 품질·편집 지속성·행동 전환을 본다. 4주 후 유지/조정/중단 및 AI 보조 실험 여부를 런북에서 결정한다.
  **Must NOT do**: 개인 선수별 참여 프로파일, 공개 인기 선수 순위, 허위 정밀 실시간 수치를 만들지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 8,9

  **References**:
  - `frontend/src/pages/admin/AdminDashboardPage.tsx:1` - 운영 현황 UI
  - `frontend/src/pages/admin/AdminContentPage.tsx:17` - 큐/이력 UI
  - `backend/database/schema.sql:95` - 기존 counter 패턴

  **Acceptance Criteria**:
  - [ ] 같은 집계 query를 두 번 실행해 동일 값이 나온다.
  - [ ] 4주 판단표에 최소 발행 안정성, quality-gate skip, 섹션 구성, 출처 클릭, 읽기 완료, 댓글 시작/완료, 공유, 정정률, 신고율이 포함된다.
  - [ ] 5명 미만 세그먼트는 화면에서 억제된다.

  **QA Scenarios**:
  ```
  Scenario: 4주 fixture 대시보드
    Tool: Playwright + SQL fixture
    Steps: 시즌 2주, 비시즌 2주의 발행/skip/열람/댓글/공유/정정 이벤트를 넣고 대시보드를 연다.
    Expected: 주간 합계와 원장 합계가 일치하고 미달 페널티 없이 source·구성 품질 경고가 보인다.
    Evidence: .omo/evidence/task-12-dashboard.png

  Scenario: 희소 세그먼트
    Tool: node --test
    Steps: 특정 학교/종목 참여자 3명 fixture를 집계한다.
    Expected: 세부값 대신 "표시 기준 미만"이 반환된다.
    Evidence: .omo/evidence/task-12-small-cell.txt
  ```

  **Commit**: YES | Message: `feat(admin): monitor editorial quality and engagement` | Files: `frontend/src/pages/admin/AdminEditorialMetricsPage.tsx`, `backend/routes/editorialAdmin.js`, `card-studio/services/editorialMetricsService.js`, `backend/tests/community-editorial-metrics.test.js`

## Final Verification Wave
> Gate A에서 MVP 범위로 한 번, Gate B에서 전체 범위로 한 번 실행하며 매번 ALL APPROVE가 필요하다.

- [ ] F1. Plan Compliance Audit
  ```
  Tool: rg + node --test
  Steps:
    1. 변경 파일 전체에서 공개 금칙어와 AI provider 호출을 스캔한다.
    2. Task 1 policy test와 editorial state/source/minor fixtures를 실행한다.
    3. 구현 diff를 Tasks 1~12의 Must Have/Must NOT Have와 체크리스트로 대조한다.
  Expected: 공개 금칙어 0, AI provider 호출 0(MVP), source/minor/state 테스트 전부 통과, 미구현·초과구현 항목 0.
  Evidence: .omo/evidence/f1-plan-compliance.md
  ```

- [ ] F2. Code Quality & Security Review
  ```
  Tool: npm test + PostgreSQL integration + npm audit + manual diff review
  Steps:
    1. root 전체 테스트와 migration up/down/concurrency 테스트를 실행한다.
    2. anonymous/non-admin/CSRF 없음/version 충돌/SSRF URL fixtures를 재실행한다.
    3. SQL parameterization, transaction boundary, rate limit, raw identifier retention을 검수한다.
  Expected: 테스트 0 failure, admin 우회 0, SSRF fixture 전부 차단, 부분 발행 0, 신규 high/critical dependency finding 0.
  Evidence: .omo/evidence/f2-security-quality.md
  ```

- [ ] F3. Real Manual QA
  ```
  Tool: Playwright headed Chromium
  Steps:
    1. 1440x900에서 관리자 로그인 -> 캘린더 -> 후보 -> 검수 -> 예약 -> 발행 -> 정정을 수행한다.
    2. 390x844에서 /community와 /community/magazine을 열고 이번 주 글, 섹션, 출처, 관련 기록, 댓글, 공유를 사용한다.
    3. 새 글 0건 주간, 비시즌 아카이브 주간, 국제 메이저 주간, API 500 fallback을 각각 확인한다.
  Expected: 콘솔/page error 0, 가로 넘침 0, 오래된 글의 오늘 표시 0, 모든 링크·상태·fallback 정상.
  Evidence: .omo/evidence/f3-browser-qa/summary.md + desktop/mobile screenshots
  ```

- [ ] F4. Production Dry Run
  ```
  Tool: PostgreSQL backup/restore scripts + scheduler shadow + quarantine dry-run + curl readiness
  Steps:
    1. 운영 DB logical backup과 restore 검증을 완료한다.
    2. migration dry-run/up/down을 clone DB에서 실행하고 row/checksum 불변을 확인한다.
    3. 예약발행 10건 shadow concurrency, 격리 후보 dry-run, rollback rehearsal을 수행한다.
    4. feature flag off 상태로 배포해 기존 /community와 /api/posts readiness를 확인한다.
  Expected: backup 복원 성공, migration 손실 0, 중복 발행 0, 무승인 격리 0, flag off 회귀 0.
  Evidence: .omo/evidence/f4-production-dry-run.md
  ```

## Commit Strategy
- fresh branch from `origin/main`; 현재 TLS 작업 브랜치 위에서 구현하지 않는다.
- Wave별 작은 PR을 만들되 기능 플래그 `EDITORIAL_ISSUES_ENABLED=false` 상태로 병합 가능하게 한다.
- DB migration, backend domain, admin UI, public UI, operations를 각각 리뷰 가능한 커밋으로 분리한다.
- 프로덕션 enable은 테스트·백업·Fable 검수 후 별도 설정 변경으로 수행한다.

## Success Criteria
- 첫 화면에서 `이번 주에 읽을 것`과 `최근 발행`이 보이며 일반 게시판이 아래에서 계속 작동한다.
- 모든 공개 이슈는 출처/수정/정정 정보를 제공하고, 관련 기록 또는 대회 화면으로 연결된다.
- 댓글·공유·팔로우 이벤트가 개인정보를 쌓지 않는 집계 형태로 측정된다.
- 4주 운영 후 `magazine_open`, `read_complete`, `source_open`, `comment_start`, `share`, `quality_gate_skip`, `return_7d`, `return_28d`로 다음 개선과 AI 보조 실험 여부를 판단할 수 있다.

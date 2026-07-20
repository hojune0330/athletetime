# AthleteTime 커뮤니티 매거진: 페이블 전 3단계 실행 계획

## 한눈에 보기

> **목표**: PR #52의 안정된 기반을 유지하면서, 남은 매거진 상세·예약 발행·운영 격리 작업을 `고난도 결정 → Terra 반복 구현 → 예외 독립 검증`의 3단계로 끝낸다.
>
> **핵심 원칙**: 단순하지만 파일 수와 토큰이 많이 드는 작업은 GPT-5.6 Terra 중간 추론에 맡긴다. 데이터 공개 범위, DB 트랜잭션, 동시성, 운영 원본 변경은 GPT-5.6 Sol 고추론 이상에서 결정하고 별도 검증한다.
>
> **페이블 전 완료 범위**: Task 8, Task 10의 구현과 자동 검증, Task 11의 dry-run·복원 리허설, 검수 패키지 작성.
>
> **페이블 전 금지 범위**: 운영 DB 실제 격리/복원, 기능 플래그 활성화, 4주 Gate A 이전의 알림(Task 9)·지표 대시보드(Task 12).

## 현재 기준선

- 저장소: `hojune0330/athletetime`
- 작업 브랜치: `codex/community-magazine`
- 기준 커밋: `af0276f`
- 현재 PR: `#52`, mergeable, 자동 검사 통과, 페이블 리뷰 전
- 미리보기: `https://deploy-preview-52--athlete-time.netlify.app`
- 완료된 범위: 기존 계획 Task 1~7
- 남은 MVP 범위: Task 8, 10, 11
- 보류 범위: Task 9, 12는 4주 Gate A 통과 후 재판단
- 작업 중 절대 스테이징 금지: `.omo/boulder.json`, `.omo/start-work/`

## 먼저 확정할 설계

### 공개 상세 화면

- 사용자가 보는 주소는 기존 `/community/post/:postId` 하나를 유지한다.
- 별도의 두 번째 상세 페이지 `/community/magazine/:slug`는 만들지 않는다.
- 매거진 전용 정보는 `GET /api/editorial/magazine/by-post/:postId`로 조회한다. 이 라우트는 `/:slug`보다 먼저 선언한다.
- 일반 게시글에서 위 API가 404를 반환하는 것은 정상이다. 일반 게시글 화면은 지금과 똑같이 작동해야 한다.
- `relatedUrl` 하나만 운영자가 검증한 관련 기록 링크로 보여준다. 이름·소속을 이용한 자동 선수 연결이나 동명이인 추정은 하지 않는다.

### 정정 이력과 공개 범위

- 현재 `editorial_revisions.review_note`는 내부 검토 메모로 계속 비공개다.
- 공개 정정 설명은 별도 필드 `public_summary`로 저장한다. 300자 이하 일반 텍스트만 허용한다.
- 예전 정정 이력에 `public_summary`가 없으면 구체 내용을 추측하지 않고 `내용을 바로잡았어요.`만 표시한다.
- 공개 serializer는 허용 필드 목록 방식으로 작성한다. `reviewNote`, actor UUID, 내부 정책 판정, 초안 내용은 응답에 존재해서는 안 된다.

### 초기 추천 수치

- 매거진 글만 `published_at`부터 정확히 2시간 동안 추천·비추천 숫자를 숨긴다.
- 버튼 사용과 댓글 읽기·쓰기는 유지한다.
- 서버가 `countsVisible`을 계산하며, 숨김 구간에는 게시글 조회 API와 투표 응답 모두 숫자를 반환하지 않는다.
- 일반 게시글은 기존 동작을 유지한다. 프론트만 가리는 방식은 금지한다.
- 기준 시계는 서버 UTC이며, 경계값 `1:59:59`, `2:00:00`을 자동 테스트한다.

### 공개 읽기 캐시

- 상세 API는 신뢰 우선으로 `Cache-Control: no-store`를 사용한다.
- 매거진 목록은 현재 60초 클라이언트 캐시를 유지하되, 정정·비공개 전환 뒤 새로 연 상세는 즉시 최신 상태여야 한다.
- CDN 캐시와 purge 도입은 실제 트래픽 근거가 생길 때 별도 과제로 둔다.

### 예약 발행과 실패 처리

- `publish_failed`를 편집 글 상태에 추가하지 않는다. 글의 상태와 실행 실패를 섞지 않는다.
- 신규 `editorial_publish_jobs` 원장을 둔다. 핵심 필드는 `issue_id`, `status(queued|retrying|failed|completed)`, `attempt_count`, `next_attempt_at`, `last_error_code`, `created_at`, `updated_at`이다.
- 원문 오류·토큰·개인정보가 포함될 수 있는 raw error는 저장하지 않는다.
- 작업자는 `FOR UPDATE SKIP LOCKED`로 due job을 선점하고, 게시글 생성·issue 갱신·calendar 갱신·감사 이벤트·job 완료를 한 트랜잭션에서 처리한다.
- 최대 시도는 최초 포함 3회, 재시도 간격은 1분·5분이다. 세 번째 실패 뒤 `failed`로 두고 관리자에게 경고한다.
- 수동 재시도는 관리자가 같은 글을 다시 예약할 때 job을 `queued`, 시도 횟수를 0으로 초기화하는 방식으로만 허용한다.
- 시스템 행위자는 `EDITORIAL_SCHEDULER_ACTOR_ID`의 관리자 UUID를 사용한다. 기능 플래그가 켜졌는데 값이 없거나 관리자 계정이 아니면 서버는 scheduler만 fail-closed하고 readiness에 원인을 표시한다.
- `EDITORIAL_SCHEDULER_ENABLED=false`가 기본값이다. 메모리 타이머는 깨우기 수단일 뿐이며 DB가 유일한 작업 원장이다.
- 종료 신호를 받으면 새 선점을 중단하고 진행 중 트랜잭션을 기다린 뒤 종료한다.

## 모델 배치 기준

| 단계 | 담당 | 추론 강도 | 맡길 일 | 맡기지 않을 일 |
|---|---|---:|---|---|
| 1. 결정·핵심 수술 | GPT-5.6 Sol | high~xhigh | 공개 계약, 마이그레이션, 상태·트랜잭션, 큰 화면 안전 분해, 동시성 구현 | 반복 문구·단순 컴포넌트 양산 |
| 2. 규격화 구현 | GPT-5.6 Terra | medium | 확정 타입에 맞춘 API client, 작은 UI, fixture, 문서, 브라우저 QA, 증거 정리 | 공개 필드 추가 결정, SQL/상태 변경, 운영 데이터 변경 |
| 3. 예외 검증 | GPT-5.6 Sol + 독립 리뷰어 | max 또는 가능한 최고 | 정보 누출, 시각 경계, 2-worker 경쟁, 장애 주입, 복원, 운영 승인 판단 | 신규 범위 확장 |

### 자동 상향 규칙

Terra 작업 중 아래 중 하나가 나오면 즉시 중단하고 3단계로 올린다.

- migration·constraint·상태 전이 변경이 필요함
- 공개 응답에 새 필드를 넣어야 함
- 내부 메모, 사용자 UUID, 미성년자 관련 값이 보임
- 기존 일반 게시글의 추천·댓글·공유 동작이 달라짐
- 운영 DB, 백업, 원본 게시글을 쓰거나 지워야 함
- 테스트 기대값보다 구현을 맞추기 위해 정책을 바꿔야 함
- 두 worker 실행 결과가 한 번이라도 비결정적임

## 실행 순서

### 1단계: 고난도 결정과 핵심 수술

- [x] 1. PR #52 기준선과 공개 계약을 고정한다

  **담당**: GPT-5.6 Sol high

  **할 일**:
  - PR #52의 전체 테스트·타입 검사·빌드 결과를 기준 증거로 저장한다.
  - 위 `먼저 확정할 설계`를 ADR과 API fixture로 고정한다.
  - 일반 게시글, 매거진 게시글, 정정 글, 비공개 글 네 종류의 공개 응답 fixture를 먼저 만든다.
  - Task 9·12의 Gate A 잠금을 자동 계약 테스트나 명시적 문서 체크로 남긴다.

  **하지 않을 일**:
  - PR #52의 완료 기능을 다시 설계하지 않는다.
  - 실제 운영 데이터를 수정하지 않는다.

  **파일 기준**:
  - `.omo/plans/athletetime-community-issue-editor.md`
  - `backend/routes/editorialAdmin.js:25`
  - `frontend/src/api/editorialPublic.ts:1`
  - `backend/tests/community-editorial-public-surface.test.js:1`
  - `docs/work-orders/20260708-community-activation-track-h.md:1`

  **완료 조건**:
  - 공개 fixture에 `reviewNote`, actor ID, 내부 정책 결과, 초안이 0건이다.
  - 일반 게시글 fixture는 기존 응답과 의미상 동일하다.
  - 설계 결정이 테스트 이름과 문서에서 같은 용어를 사용한다.

  **증거**:
  - `.omo/evidence/community-magazine-tier1/baseline.txt`
  - `.omo/evidence/community-magazine-tier1/public-contract.json`

  **QA 시나리오**:
  ```text
  Scenario: PR #52 기준선 고정
    Tool: PowerShell + npm
    Steps:
      1. `npm run test:community-editorial`을 실행한다.
      2. `npm --prefix frontend run type-check`와 `npm --prefix frontend run build`를 실행한다.
      3. 종료 코드와 테스트 개수를 baseline.txt에 기록한다.
    Expected: 모든 명령 exit 0, 기존 PR #52와 실패 수 0이 일치한다.

  Scenario: 공개 계약 금지 필드 검사
    Tool: `node --test backend/tests/community-editorial-public-surface.test.js`
    Steps: 일반·매거진·정정·비공개 fixture의 JSON을 직렬화해 금지 필드 목록과 대조한다.
    Expected: reviewNote, actor ID, policy 내부값, draft content 검출 0; 비공개 글은 404다.
  ```

- [ ] 2. PostDetail을 먼저 안전하게 분해한 뒤 매거진 계약을 연결한다

  **담당**: GPT-5.6 Sol xhigh

  **할 일**:
  - 900줄을 넘는 `PostDetailPage.tsx`에서 기존 `PostHeader`, `PostContent`, `PollSection`, `PostActions`, `CommentSection`, modal 묶음을 동작 변경 없이 작은 컴포넌트로 추출한다.
  - refactor 전후 일반 게시글의 렌더·추천·댓글·공유·수정·삭제 계약을 먼저 잠근다.
  - `GET /api/editorial/magazine/by-post/:postId`와 공개 allowlist serializer를 추가한다.
  - migration으로 revision의 `public_summary`를 추가하고 up/down·기존 행 호환을 검증한다.
  - 서버 측 2시간 추천 수치 숨김을 게시글 조회와 투표 응답 양쪽에 적용한다.
  - PostDetail은 매거진일 때만 출처, 관련 기록 1개, 토론 질문, 공개 정정 이력 slot을 연다.

  **하지 않을 일**:
  - 관리자 `review_note`를 재사용하지 않는다.
  - 이름·소속 기반 관련 선수 자동 연결을 추가하지 않는다.
  - refactor와 시각 리디자인을 한 커밋에 섞지 않는다.

  **파일 기준**:
  - `frontend/src/pages/PostDetailPage.tsx:63`
  - `frontend/src/pages/PostDetailPage.tsx:686`
  - `frontend/src/components/community/MagazineCard.tsx:54`
  - `backend/routes/editorialAdmin.js:188`
  - `backend/routes/posts.js:212`
  - `backend/routes/votes.js:92`
  - `card-studio/repositories/editorialRepositoryReads.js:66`
  - `card-studio/repositories/editorialRepositoryViews.js:1`
  - `backend/database/migration-006-community-editorial.sql:1`

  **완료 조건**:
  - 일반/매거진 상세가 같은 `/community/post/:postId`에서 렌더된다.
  - 일반 게시글 회귀 테스트가 refactor 전후 모두 통과한다.
  - 숨김 구간의 GET·vote 응답에 추천 숫자가 없고 `countsVisible=false`다.
  - 정확히 2시간부터 수치가 보인다.
  - 공개 정정 응답에 내부 메모가 없으며 migration up/down이 통과한다.

  **QA 시나리오**:
  ```text
  Scenario: 매거진 상세의 정상 사용자 흐름
    Tool: Playwright Chromium, 390x844와 1440x900
    Steps: 게시글 상세를 열고 출처 → 관련 기록 → 댓글 작성 → 공유를 차례로 실행한다.
    Expected: 동일 post route를 유지하고 모든 링크·댓글·공유가 성공하며 콘솔 오류와 가로 스크롤이 0이다.

  Scenario: 2시간 수치 경계와 일반 글 fallback
    Tool: `node --test backend/tests/community-editorial-detail.test.js backend/tests/community-editorial-vote-visibility.test.js`
    Steps:
      1. 서버 시계를 publishedAt+1:59:59와 +2:00:00로 고정해 GET과 vote를 각각 호출한다.
      2. 일반 게시글 ID로 by-post API의 404를 발생시킨 뒤 PostDetail을 렌더한다.
    Expected: 첫 시각에는 countsVisible=false와 수치 필드 부재, 두 번째에는 true와 수치 존재; 일반 글은 기존 UI로 정상 렌더된다.

  Scenario: 내부 메모 누출 방지
    Tool: `node --test backend/tests/community-editorial-public-surface.test.js`
    Steps: review_note에 고유 표식 `INTERNAL_ONLY_52`를 넣고 공개 list/detail/post 응답 전체를 문자열 검색한다.
    Expected: 고유 표식과 reviewNote 키 모두 0건이다.
  ```

  **커밋 분리**:
  - `refactor(community): split post detail without behavior changes`
  - `feat(editorial): expose safe magazine detail contract`
  - `feat(community): connect magazine detail context`

- [ ] 3. DB 원장 기반 예약 발행을 트랜잭션 단위로 구현한다

  **담당**: GPT-5.6 Sol xhigh

  **할 일**:
  - `editorial_publish_jobs` migration과 rollback을 추가한다.
  - pool 트랜잭션을 내부에서 새로 여는 기존 `transitionIssue`와 분리해, 이미 선점한 client를 받는 transaction-bound publish 함수를 만든다.
  - due job 선점, 원자적 publish, 지속 재시도, 재시작 시 overdue 처리, 수동 재예약을 구현한다.
  - scheduler feature flag, 관리자 actor 검증, readiness 상태, start/stop lifecycle을 서버에 연결한다.
  - correction/unpublish가 공개 목록·상세·post와 한 트랜잭션 의미를 유지하는지 계약을 보강한다.

  **하지 않을 일**:
  - `setInterval` 메모리 상태만으로 예약을 보존하지 않는다.
  - 실패한 글을 `published`로 보이게 하지 않는다.
  - raw DB 오류를 job이나 관리자 응답에 저장하지 않는다.

  **파일 기준**:
  - `card-studio/repositories/editorialStateMachine.js:1`
  - `card-studio/repositories/postgresEditorialRepository.js:57`
  - `card-studio/services/editorialIssueService.js:1`
  - `src/server.js:260`
  - `src/server.js:460`
  - `backend/database/migration-006-community-editorial.sql:165`

  **완료 조건**:
  - worker 2개가 due issue 10개를 동시에 처리해 post 10개, 중복 0개다.
  - post insert 뒤 강제 실패 시 issue/post/calendar/event/job이 부분 반영되지 않는다.
  - 서버 재시작 뒤 overdue job은 정확히 한 번 처리된다.
  - 3번째 실패 뒤 job만 `failed`, issue는 `scheduled`로 남고 관리자 경고가 보인다.
  - flag off 또는 actor 누락 시 자동 발행은 0건이며 기존 서버 기능은 정상이다.

  **증거**:
  - `.omo/evidence/community-magazine-tier1/scheduler-concurrency.txt`
  - `.omo/evidence/community-magazine-tier1/scheduler-fault-injection.txt`
  - `.omo/evidence/community-magazine-tier1/scheduler-restart.txt`

  **QA 시나리오**:
  ```text
  Scenario: 복수 worker의 정확히 한 번 발행
    Tool: `node --test backend/tests/community-editorial-scheduler-postgres.integration.test.js`
    Steps: PostgreSQL fixture에 due job 10개를 만들고 scheduler worker 2개를 Promise.all로 동시에 실행한다.
    Expected: posts=10, completed jobs=10, issue별 publish audit=1, 중복 post=0이다.

  Scenario: 원자성·재시도·재시작
    Tool: 같은 PostgreSQL integration test의 fault-injection fixture
    Steps:
      1. post insert 직후 예외를 주입하고 DB 상태를 확인한다.
      2. 1분·5분 clock을 전진시켜 3회 실패시킨다.
      3. 두 번째 시도 전에 scheduler 인스턴스를 폐기하고 새 인스턴스로 overdue job을 처리한다.
    Expected: 부분 반영 0, 재시도 시각 일치, 세 번째 실패 후 job=failed/issue=scheduled, 재시작 후 성공 job은 한 번만 발행된다.

  Scenario: 안전한 비활성화
    Tool: `node --test backend/tests/community-editorial-scheduler-lifecycle.test.js`
    Steps: flag off, actor 누락, 비관리자 actor를 각각 주입해 서버 초기화와 readiness를 검사한다.
    Expected: community API는 기동되고 scheduler write는 0이며 readiness에 안전한 오류 코드만 남는다.
  ```

### 2단계: Terra 중간 추론으로 규격화·반복 구현

- [ ] 4. 확정된 공개 타입과 작은 UI를 채운다

  **담당**: GPT-5.6 Terra medium

  **선행 조건**: 1단계 Task 1·2의 fixture와 공개 계약이 고정되어 있어야 한다.

  **할 일**:
  - `editorialPublic.ts`에 by-post 상세 parser를 추가하고 목록/상세 공통 parser를 정리한다.
  - 출처 목록, 관련 기록 링크, 토론 질문, 정정 타임라인, 초기 수치 숨김 안내를 작은 표현 컴포넌트로 만든다.
  - 로딩·404 fallback·일시 오류 상태와 모바일 390px 레이아웃을 구현한다.
  - Web Share와 clipboard fallback의 성공 안내를 기존 톤으로 통일한다.

  **상향 조건**:
  - 응답 필드·정책·DB를 바꿔야 하면 즉시 3단계 검증 대기열로 보낸다.

  **완료 조건**:
  - 일반 글에서 매거진 UI 0개, 매거진 글에서 필요한 블록이 모두 보인다.
  - 긴 URL, 긴 출처명, 출처 0개 오류 fixture에서도 가로 스크롤이 없다.
  - type-check와 build가 통과한다.

  **QA 시나리오**:
  ```text
  Scenario: 상세 UI의 정상·빈·오류 상태
    Tool: Playwright route interception
    Steps: by-post API를 차례로 200 정상, 200 sources=[], 404, 500으로 바꾸고 같은 PostDetail route를 연다.
    Expected: 정상에는 전용 블록, 빈 값에는 과장 없는 빈 상태, 404에는 일반 글 UI, 500에는 재시도 안내가 보이며 페이지 전체는 유지된다.

  Scenario: 모바일 긴 문자열
    Tool: Playwright Chromium 390x844
    Steps: 200자 출처명과 긴 URL fixture를 렌더하고 screenshot과 scrollWidth를 측정한다.
    Expected: `document.documentElement.scrollWidth <= window.innerWidth`, 잘린 링크도 키보드로 열 수 있다.
  ```

  **파일 기준**:
  - `frontend/src/api/editorialPublic.ts:1`
  - `frontend/src/pages/PostDetailPage.tsx:686`
  - `frontend/src/components/editorial/` - 이 작업에서 신규 생성하는 표현 전용 디렉터리

- [ ] 5. scheduler 운영 표면과 반복 테스트를 채운다

  **담당**: GPT-5.6 Terra medium

  **선행 조건**: 1단계 Task 3의 job schema와 상태 계약이 고정되어 있어야 한다.

  **할 일**:
  - 관리자 화면에 queued/retrying/failed/completed 상태, 시도 횟수, 다음 시도 시각, 안전한 오류 코드를 표시한다.
  - 실패 job 재예약 UI를 기존 expectedVersion 규칙에 맞춘다.
  - 결정된 1분·5분 backoff fixture, 10개·100개 due job fixture, 문서 예시를 작성한다.
  - scheduler 실행·중지·장애 대응 runbook과 환경변수 설명을 작성한다.

  **완료 조건**:
  - 비관리자·CSRF 없음·낡은 version 요청은 모두 거절된다.
  - 관리자 UI에서 raw error, actor UUID, 토큰 값이 보이지 않는다.
  - 기능 플래그 off 상태의 배포 절차가 runbook 첫 단계다.

  **QA 시나리오**:
  ```text
  Scenario: 관리자 job 상태와 재예약
    Tool: `node --test backend/tests/community-editorial-admin-ui.test.js backend/tests/community-editorial-scheduler-api.test.js`
    Steps: queued→retrying→failed fixture를 조회하고, 올바른 expectedVersion으로 재예약한다.
    Expected: 상태·시도 횟수·다음 시각이 보이고 재예약 뒤 queued/attempt_count=0이다.

  Scenario: 권한·CSRF·버전 충돌
    Tool: 같은 API test
    Steps: 익명, 일반 회원, CSRF 누락 관리자, 낡은 expectedVersion 관리자 요청을 각각 전송한다.
    Expected: 순서대로 401/403/403/409이며 DB job과 issue version 변화는 0이다.
  ```

  **파일 기준**:
  - `frontend/src/api/editorialAdmin.ts:1`
  - `frontend/src/components/admin/editorial/IssueEditorPanel.tsx:1`
  - `backend/tests/community-editorial-admin-ui.test.js:1`
  - `docs/runbooks/`

- [ ] 6. 격리 dry-run과 페이블 증거 묶음을 만든다

  **담당**: GPT-5.6 Terra medium

  **할 일**:
  - 운영 DB를 쓰지 않고 clone/fixture에서 `community-post-quarantine.js`의 dry-run을 반복한다.
  - 승인 ID allowlist, 대상 수, comment 수, 전후 checksum, actor, timestamp를 한 템플릿으로 정리한다.
  - 백업 원본이 없거나 checksum이 다르면 실행을 막는 실패 시나리오를 기록한다.
  - PR별 변경 파일, 테스트, 남은 위험, rollback 명령을 페이블용 1페이지 인덱스로 만든다.

  **하지 않을 일**:
  - 운영 DB에 write하지 않는다.
  - 제목 패턴만으로 격리 대상을 자동 확정하지 않는다.

  **완료 조건**:
  - dry-run은 동일 입력에서 동일 ID·checksum을 반환한다.
  - allowlist 밖의 게시글·댓글 수는 바뀌지 않는다.
  - 백업/actor/승인 파일 중 하나라도 없으면 exit non-zero다.

  **파일 기준**:
  - `scripts/community-post-quarantine.js:1`
  - `docs/runbooks/community-post-quarantine.md:1`
  - `backend/tests/community-post-quarantine.test.js:1`

  **QA 시나리오**:
  ```text
  Scenario: fixture dry-run 결정성
    Tool: PowerShell + Node CLI
    Steps:
      1. `NODE_ENV=test`와 `COMMUNITY_QUARANTINE_FIXTURE_DB`를 disposable fixture로 설정한다.
      2. `node scripts/community-post-quarantine.js --report .omo/evidence/community-magazine-tier2/candidates-a.json`을 실행한다.
      3. 같은 DB로 candidates-b.json을 만들고 candidate IDs와 databaseChecksum을 비교한다.
    Expected: 두 결과의 IDs와 databaseChecksum이 같고 fixture DB의 quarantine 변화는 0이다.

  Scenario: 승인·백업 실패는 무변경
    Tool: `node --test backend/tests/community-post-quarantine.test.js`
    Steps: 누락 backup, stale checksum, allowlist 밖 ID, 별도 승인 없는 댓글 게시글 fixture를 실행한다.
    Expected: 모두 reject/exit non-zero이며 mutation count=0, transaction rollback이다.
  ```

### 3단계: 예외 사항 최고 추론·독립 검증

- [ ] 7. 공개 정보와 일반 게시글 회귀를 독립 검증한다

  **담당**: GPT-5.6 Sol max + 별도 보안/QA 리뷰어

  **검증 항목**:
  - 공개 detail/list/post/vote 응답 전체 allowlist 비교
  - `reviewNote`, actor UUID, 내부 policy 결과, draft content 누출 0
  - 정정 전후 캐시·404·unpublish 동작
  - 미성년자 관련 글과 동명이인 관련 링크가 자동 추론되지 않음
  - 일반 게시글의 추천·댓글·poll·수정·삭제·공유 회귀 0

  **실행 검증**:
  - `node --test backend/tests/community-editorial-postgres.integration.test.js`
  - `node --test backend/tests/community-editorial-api-postgres.integration.test.js`
  - `node --test backend/tests/community-editorial-post-boundary-postgres.integration.test.js`
  - `node --test backend/tests/community-editorial-public-surface.test.js`
  - root 전체 테스트, frontend type-check, frontend build

  **완료 조건**:
  - 독립 리뷰 finding이 0이거나 모든 finding이 해결되고 재검증된다.
  - 공개 응답 snapshot에 금지 필드가 하나도 없다.

- [ ] 8. scheduler 경쟁·장애·복구를 독립 검증한다

  **담당**: GPT-5.6 Sol max + 독립 ultrawork reviewer

  **검증 항목**:
  - 2-worker·10-worker 동시 선점
  - transaction 중간 단계별 장애 주입
  - process kill 후 restart와 overdue 처리
  - actor 누락·비관리자 actor·flag off
  - 시계 경계, KST 입력→UTC 저장, DST 비의존성
  - migration up/down/up와 기존 데이터 보존

  **완료 조건**:
  - 중복 post, 부분 반영, 유실 job이 0건이다.
  - retry가 프로세스 재시작 뒤에도 이어진다.
  - rollback 전후 기존 editorial row checksum이 일치한다.

  **QA 시나리오**:
  ```text
  Scenario: 경쟁·kill·복구 감사
    Tool: PostgreSQL test container + `node --test backend/tests/community-editorial-scheduler-postgres.integration.test.js`
    Steps: worker 10개로 due job 100개를 실행하고 임의 worker를 transaction 중 kill한 뒤 새 worker를 시작한다.
    Expected: 100개가 각각 한 번 완료되고 중복·유실·부분 post가 0이다.

  Scenario: migration 왕복과 actor 예외
    Tool: migration runner + scheduler lifecycle test
    Steps: 기존 editorial fixture에 up→검사→down→checksum→up을 실행하고 actor 누락/비관리자 actor로 scheduler를 시작한다.
    Expected: rollback 뒤 기존 checksum 일치, 재-up 성공, 잘못된 actor에서 scheduler write=0이다.
  ```

- [ ] 9. 운영 clone 복원 리허설 후 페이블 승인 패키지를 닫는다

  **담당**: GPT-5.6 Sol max, 최종 판단은 페이블

  **할 일**:
  - 운영 백업의 clone에서만 승인 ID 격리→공개 표면 확인→복원을 수행한다.
  - post/content/comment/counter checksum을 전후 비교한다.
  - feature flag off 상태의 배포 preview를 확인한다.
  - 페이블에게 `무엇이 바뀜 / 자동 검증 / 수동 검증 / 남은 위험 / 실제 운영 write 승인 항목`을 한 페이지로 전달한다.

  **중단 조건**:
  - backup restore 실패
  - checksum 불일치
  - 일반 게시글 회귀
  - scheduler 중복 또는 공개 필드 누출

  **완료 조건**:
  - 위 중단 조건 0건, 전체 자동 검사 green, 브라우저 콘솔 오류 0.
  - 운영 DB 실제 격리와 scheduler flag 활성화는 페이블의 명시적 승인 항목으로 남아 있다.

  **QA 시나리오**:
  ```text
  Scenario: clone 격리·복원 왕복
    Tool: pg_dump/pg_restore + quarantine CLI + Playwright
    Steps:
      1. 운영 백업을 격리된 clone DB에 복원하고 before checksum을 기록한다.
      2. 승인 fixture ID만 quarantine하고 목록·직접 URL·검색에서 보이지 않는지 확인한다.
      3. restore를 실행하고 post/content/comment/counter checksum을 다시 계산한다.
    Expected: 격리 대상만 비공개, 비대상 변화 0, 복원 후 checksum이 before와 동일하다.

  Scenario: 승인 자료 누락 시 중단
    Tool: quarantine CLI
    Steps: backup receipt, actor, approval file을 하나씩 제거해 write 명령을 실행한다.
    Expected: 각 실행 exit non-zero, clone DB checksum 불변, 운영 DB 연결 시도 0이다.
  ```

## PR과 커밋 전략

- PR #52는 기준선으로 보존한다. 새로운 고위험 작업을 한꺼번에 밀어 넣지 않는다.
- PR #52 head에서 아래 stacked branch를 만든다.
  1. `codex/editorial-detail-contract` - Task 1·2·4
  2. `codex/editorial-scheduler` - Task 3·5
  3. `codex/editorial-ops-verification` - Task 6·7·8·9의 문서·테스트·증거
- migration, 서버 트랜잭션, 프론트 UI를 한 커밋에 섞지 않는다.
- Terra 커밋은 확정 계약 밖의 파일을 건드리면 받지 않는다.
- 각 stacked PR은 이전 PR을 base로 열고, 마지막에 main 기준 통합 검증을 한 번 더 한다.

## 페이블에게 넘길 최종 패키지

1. 변경 목적과 사용자 체감 10줄 요약
2. 공개 API allowlist before/after snapshot
3. 일반 게시글 회귀 결과
4. scheduler 2-worker·장애·재시작 증거
5. migration up/down/up과 checksum
6. 격리 dry-run·clone 복원 결과
7. 운영에서 아직 꺼 둔 flag 목록
8. Task 9·12 Gate A 보류 근거
9. 페이블이 결정할 항목 두 개
   - scheduler 운영 flag 활성화 여부
   - 승인 ID에 한정한 운영 격리 실행 여부

## 전체 완료 기준

- Task 8: 사용자가 기존 게시글 주소에서 출처·관련 기록·토론·공유·정정 이력을 안전하게 본다.
- Task 10: 예약 발행이 서버 재시작과 복수 worker에서도 중복·부분 반영 없이 작동한다.
- Task 11: 실제 운영 원본을 건드리기 전에 격리와 복원이 clone에서 동일 checksum으로 재현된다.
- 일반 게시글과 기존 PR #52 기능에 회귀가 없다.
- Task 9·12는 Gate A 전까지 코드가 생기지 않는다.
- 운영 write와 기능 활성화는 페이블 승인 전 실행되지 않는다.

## 실행 에이전트 지시서

아래 지시서는 계획을 요약하거나 재해석하는 문서가 아니다. 작업자는 반드시 이 계획 전체를 먼저 읽고, 자신의 지시서와 충돌할 때 계획 본문을 우선한다.

### 지시서 A: 1단계 고난도 결정·핵심 수술

**배정**: GPT-5.6 Sol, Task 1은 high, Task 2·3은 xhigh

```text
저장소: C:\Users\SAMSUNG\Documents\2026 첫프젝\athletetime-pr50
기준: PR #52 head af0276f
필독 계획: .omo/plans/athletetime-community-magazine-three-tier-pre-fable.md
담당: 계획 Task 1, 2, 3만 수행한다.

작업 순서:
1. PR #52 기준선 테스트와 공개 allowlist fixture를 먼저 고정한다.
2. codex/editorial-detail-contract 브랜치에서 PostDetail 무동작변경 분리 커밋을 먼저 만든다.
3. 신규 migration-009로 public_summary를 추가하고, by-post 공개 API와 서버 측 2시간 수치 숨김을 구현한다.
4. 상세 계약이 green인 뒤 codex/editorial-scheduler 브랜치를 그 head에서 만든다.
5. 신규 migration-010으로 editorial_publish_jobs를 추가한다.
6. transaction-bound publish, SKIP LOCKED claim, 3회 시도, restart, lifecycle을 구현한다.

소유 파일:
- backend/routes/editorialAdmin.js
- backend/routes/posts.js
- backend/routes/votes.js
- card-studio/repositories/editorialRepository*.js
- card-studio/repositories/editorialStateMachine.js
- card-studio/repositories/postgresEditorialRepository.js
- card-studio/services/editorialIssueService.js
- 신규 card-studio/services/editorialScheduler.js
- backend/database/migration-009-*.sql 및 rollback
- backend/database/migration-010-*.sql 및 rollback
- frontend/src/pages/PostDetailPage.tsx와 동작 보존용 추출 컴포넌트
- Task 1~3 신규 계약·integration tests
- src/server.js의 scheduler lifecycle

절대 금지:
- review_note 또는 actor UUID 공개
- 일반 게시글 응답/행동 변경
- publish_failed를 issue 상태에 추가
- 이름·소속 자동 연결
- 운영 DB write와 scheduler flag 활성화
- .omo/boulder.json, .omo/start-work/ 스테이징

작업자는 혼자가 아니다. 다른 작업자의 커밋을 되돌리지 말고 현재 diff를 먼저 확인한다.
각 커밋 뒤 관련 단위 테스트를 실행하고, Task 1~3 완료 뒤 전체 test/type-check/build를 실행한다.
정책·공개 필드·DB 상태에 새로운 판단이 필요하면 구현하지 말고 ESCALATE 보고를 남긴다.
완료 보고에는 커밋, 변경 파일, 테스트 수, 실패 주입 결과, 남은 위험을 포함한다.
```

### 지시서 B: 2단계 Terra 규격화·반복 구현

**배정**: GPT-5.6 Terra, reasoning medium

```text
저장소: C:\Users\SAMSUNG\Documents\2026 첫프젝\athletetime-pr50
필독 계획: .omo/plans/athletetime-community-magazine-three-tier-pre-fable.md
선행 조건: 지시서 A의 공개 fixture, migration-009/010, scheduler 계약이 green이어야 한다.
담당: 계획 Task 4, 5, 6만 수행한다.

할 일:
1. 고정된 by-post 응답 parser와 작은 표현 UI를 구현한다.
2. sources=[], 404, 500, 긴 문자열, 390px 상태를 fixture 그대로 처리한다.
3. 고정된 job 상태를 읽는 관리자 표면과 재예약 UI를 구현한다.
4. 기존 expectedVersion, 관리자 권한, CSRF 규칙을 그대로 사용한다.
5. quarantine은 fixture/clone dry-run만 수행하고 페이블 증거 인덱스를 만든다.
6. 계획에 기재된 QA 명령과 브라우저 시나리오를 모두 실행한다.

소유 파일:
- frontend/src/api/editorialPublic.ts
- 신규 frontend/src/components/editorial/* 표현 컴포넌트
- frontend/src/api/editorialAdmin.ts의 확정 타입 연결 부분
- frontend/src/components/admin/editorial/IssueEditorPanel.tsx의 job 표시 부분
- 관련 frontend 계약 테스트와 Playwright evidence
- docs/runbooks의 scheduler/quarantine 실행 설명
- .omo/evidence/community-magazine-tier2/*

수정 금지:
- migration, DB constraint, state transition
- 공개 API 필드 추가·삭제
- backend transaction과 server lifecycle
- 운영 DB, 운영 게시글, 백업 원본
- 일반 게시글 정책과 추천 수치 규칙

즉시 상향 조건:
- fixture만으로 UI 구현이 불가능함
- 공개 응답 필드 변경이 필요함
- 내부 메모·UUID·미성년 관련 값이 발견됨
- 일반 게시글 테스트가 깨짐
- SQL이나 운영 데이터 수정이 필요함

상향 시 임의 우회하지 말고 파일, 실패 명령, 기대값, 실제값을 ESCALATE 보고로 남긴다.
작업자는 혼자가 아니다. 다른 작업자의 변경을 되돌리지 않고 지정된 소유 파일만 편집한다.
```

### 지시서 C: 3단계 예외·독립 검증

**배정**: GPT-5.6 Sol max + codex-ultrawork-reviewer

```text
저장소: C:\Users\SAMSUNG\Documents\2026 첫프젝\athletetime-pr50
필독 계획: .omo/plans/athletetime-community-magazine-three-tier-pre-fable.md
담당: 계획 Task 7, 8, 9의 검증만 수행한다. 새 기능을 제안하거나 범위를 확장하지 않는다.

검증 순서:
1. 공개 list/detail/post/vote 응답을 allowlist snapshot과 대조한다.
2. reviewNote, actor UUID, 내부 policy 결과, draft content 고유 표식을 전수 검색한다.
3. 일반 게시글 추천·댓글·poll·수정·삭제·공유 회귀를 실행한다.
4. 2-worker와 10-worker, 10개와 100개 due job을 각각 실행한다.
5. transaction 단계별 장애, process kill, restart, overdue, actor 예외를 검증한다.
6. migration up/down/up과 기존 row checksum을 검증한다.
7. 운영 백업 clone에서만 승인 ID quarantine→공개 확인→restore를 수행한다.
8. 전체 test/type-check/build와 데스크톱·모바일 브라우저 QA를 실행한다.

즉시 REJECT 조건:
- 공개 금지 필드 1건 이상
- 중복 post, 유실 job, 부분 반영 1건 이상
- 일반 게시글 회귀 1건 이상
- clone 복원 checksum 불일치
- 운영 DB write 시도
- scheduler flag 기본 활성화

결과 형식:
- Findings를 심각도 순으로 먼저 제시한다.
- 각 finding에 파일/행, 재현 명령, 영향, 필요한 수정, 재검증 명령을 적는다.
- finding 0건이면 잔여 위험과 수행하지 못한 검증을 명시한다.
- 실제 운영 격리와 scheduler 활성화는 수행하지 않고 페이블 결정 항목으로 남긴다.
```

### 페이블 최종 승인 지시

```text
PR #52와 stacked PR 3개의 목적·diff·증거를 검토한다.
우선 확인 순서는 공개 정보 누출 → 일반 글 회귀 → scheduler 원자성 → clone 복원이다.
자동 검사 green만으로 승인하지 않고 Task 7~9 evidence의 실제 명령·결과를 대조한다.

승인 가능한 상태:
- 독립 리뷰 finding 0 또는 수정·재검증 완료
- 운영 flag는 아직 off
- 운영 DB write는 아직 미실행
- Task 9·12는 Gate A 잠금 유지

최종 결정은 두 개로 제한한다.
1. EDITORIAL_SCHEDULER_ENABLED 운영 활성화 승인/보류
2. 승인 ID allowlist에 한정한 운영 quarantine 실행 승인/보류

각 결정에는 근거, 롤백 조건, 실행 담당, 증거 경로를 PR 코멘트로 남긴다.
```

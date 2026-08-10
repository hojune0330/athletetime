# AthleteTime 개인 메모와 기록 경험 안전 고도화 계획

## TL;DR
> **Summary**: 공개 기록 탐색, 팀의 익명 성과판, 계정 전용 개인 메모를 서로 다른 제품 경계로 고정한다. 개인 메모 v1은 최근 재인증을 거친 계정만 쓰는 텍스트 전용 암호화 보관함이며, 사진·파일·공개 공유·검색·선수 자동 연결은 열지 않는다.
> **Deliverables**:
> - 비공개 텍스트 메모의 암호화 저장·최근 재인증·삭제/복구/내보내기 계약
> - 공개 기록·팀 집계·정정 요청에서 메모가 완전히 제외되는 API/화면/로그 경계
> - 학생·공용기기·모바일·오류 복구 중심의 짧고 분명한 메모 UX
> - 팀 세부 통계의 5인 미만 서버 억제와 공개 DTO 회귀 방지
> - 자동·브라우저·운영 준비 증거
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5 -> Task 8 -> F1-F4

## Context

### Original Request
- 개인 메모와 비공개 메모를 빠르고 편하게 사용하면서도 안전하게 관리한다.
- 실제 선수·학생·팀·운영자·공격자 등 다양한 관점에서 더 나은 UX와 개선점을 찾는다.
- 공개 기록과 개인 정보가 섞여 신뢰를 해치지 않게 한다.

### Target Baseline
- **Implementation repository**: `https://github.com/hojune0330/athletetime`
- **Implementation start point**: 실행 시점의 깨끗한 `origin/main`에서 새 브랜치를 만든다.
- **Do not use as base**: 현재 배포 복구용 `codex/fix-render-reports-migration` 작업트리와 그 미커밋 변경은 이 계획의 기반이나 범위가 아니다.
- **Current foundations**:
  - 공개 기록 모음은 `frontend/src/features/record-workspace/`의 브라우저 전용 기능이며, 본인 확인이나 계정 소유권을 뜻하지 않는다.
  - 팀 통계는 `card-studio/services/teamStatisticsService.js`와 `teamDetailService.js`의 공개 집계이며, 개인 식별자 차단 계약이 있다.
  - 인증은 HttpOnly 쿠키와 전역 CSRF 방어를 사용하며 `req.user.id`를 서버 소유권 기준으로 쓸 수 있다.
  - `/api/upload`는 공개 Cloudinary URL을 반환하므로 개인 자료에 사용할 수 없다.

### Persona Findings Applied
- 공용 기기 학생: 브라우저 저장소에 남는 메모는 다음 사용자에게 보일 수 있다. 개인 메모는 계정 보관함에만 저장하고 브라우저 저장소에는 본문을 남기지 않는다.
- 대학 주장·코치: 팀 화면은 선수 명단의 우회로가 아니라 선택 시즌의 공개 집계 성과판이어야 한다.
- 보호자: 공개 색인은 완전한 공식 이력처럼 보이지 않아야 하고, 정정 요청에는 최소한의 공개 맥락만 받는다.
- 저속 모바일·보조기기 사용자: 저장 실패·잠김·네트워크 오류마다 하나의 짧은 복구 행동과 포커스/터치 기준이 필요하다.
- 보안 공격자·운영자: 다른 계정·관리자·지원 요청·로그·분석·공개 API 어느 곳에도 메모 제목/본문/ID가 새면 안 된다.

### Metis Review (gaps addressed)
- 기준 저장소 혼동: 위 Target Baseline으로 고정하고 깨끗한 `origin/main` 외 브랜치는 구현 기반에서 제외한다.
- 암호화/키 관리: 별도 다중 키 환경 변수, key-version 저장, 암호 키 누락 시 fail-closed로 결정한다.
- 재인증: 이메일 비밀번호 재확인 후 10분짜리 HttpOnly 쿠키로 열며, 모든 메모 읽기/쓰기/내보내기에 적용한다.
- 삭제: 30일 복구함 뒤 암호문 자체를 제거하고, 실행 스케줄과 백업 만료 준비 검사를 출시 게이트에 넣는다.
- 팀·공개 경계: 5인 미만 세부 그룹을 서버에서 억제하고, 숨은 정렬 키·출처 ID까지 DTO 금지 스캔 대상에 넣는다.

## Work Objectives

### Core Objective
사용자가 공용 기록을 찾고 팀의 공개 집계 성과를 볼 때는 신원·완전성을 과장하지 않으며, 개인 생각은 로그인한 본인만 볼 수 있는 별도 보관함에서 안전하게 다루게 한다.

### Non-Negotiable Product Decisions
| 항목 | 결정 |
| --- | --- |
| v1 메모 범위 | 제목 80자 + 본문 12,000자 이내의 평문 텍스트만. 파일·사진·음성·링크 미리보기·AI 분석·검색·공유 없음. |
| 메모 소유 | `private_memos.user_id = req.user.id`만 사용. URL/본문의 userId, 공개 `athleteKey`, `record_id`, `sourceId`, team key를 저장하거나 해석하지 않음. |
| 암호화 | 제목과 본문을 하나의 JSON payload로 AES-256-GCM 암호화. DB에는 암호문/IV/tag/key version만 저장하고 평문 제목·본문·미리보기·검색색인을 두지 않음. |
| 키 관리 | `PRIVATE_MEMO_ENCRYPTION_KEYS_JSON`의 `{version: base64-32byte-key}`와 `PRIVATE_MEMO_ACTIVE_KEY_VERSION` 사용. `DATA_RIGHTS_ENCRYPTION_KEY`와 절대 공유하지 않음. 누락/형식오류/알 수 없는 version은 해당 요청을 503으로 fail-closed. |
| 재인증 | 이메일 비밀번호를 다시 확인한 뒤 `athletetime_recent_memo_auth` HttpOnly/Secure/SameSite=Lax 쿠키를 10분 발급. 메모 목록·읽기·생성·수정·삭제·복구·내보내기 전부 필요. Bearer-only 요청은 허용하지 않음. |
| 삭제/복구 | 삭제는 `deleted_at`/`purge_after`를 함께 설정, 30일간 본인만 휴지통에서 복구 가능, 이후 암호문을 영구 제거. 계정 행 삭제 시 FK cascade로 즉시 제거. |
| 동시 편집 | 모든 변경/삭제/복구에 현재 `version`을 보낸다. 서버 버전과 다르면 409 `MEMO_VERSION_CONFLICT`, 서버 본문은 반환하지 않음. |
| 용량/속도 | 계정당 활성+휴지통 200개, 목록 50개 페이지, 생성/수정 20회/10분/계정, 재인증 5회/15분/계정+IP. 모든 응답은 `Cache-Control: no-store`. |
| 팀 세부 그룹 | 새 `season × event × division` 집계는 서로 다른 공개 선수 키가 5명 미만이면 수치·차트점·정렬키·원시 인원 모두 생략한다. 현재 팀 스냅샷의 범위를 넓히지 않는다. |

### Must Have
- 비회원은 비공개 보관함을 열 수 없고, 다른 계정/없는 메모는 같은 404만 받는다.
- 메모 제목·본문은 localStorage/sessionStorage/URL/로그/분석 이벤트/공개 DTO/관리자·지원 화면에 남지 않는다.
- 메모 화면은 공개 기록 상세 안에 삽입하지 않는다. `/me/memos`의 잠금 화면과 별도 화면만 쓴다.
- 정정 요청은 기존 `/data-request` 흐름만 쓰며, 메모 텍스트는 요청 또는 운영 기록으로 전달하지 않는다.
- 화면은 375px에서 가로 스크롤 없이, 잠김·저장·오류·삭제/복구 상태를 짧은 문장과 하나의 주 행동으로 보인다.

### Must NOT Have
- 선수 자동 매칭/동명이인 병합/계정-공개 기록 자동 연결
- 개인 메모를 팀 통계, 기록 검색, 프로필 카드, 커뮤니티, 채팅, 관리자 대시보드에 노출하거나 쓰기
- `/api/upload`, Cloudinary, multer, multipart, public URL, 다운로드 가능한 사진/파일 사용
- 종단간 암호화, 운영자가 기술적으로 절대 보지 못한다는 보장, 공식 기록/공식 팀/공식 순위 표현
- 기존 공개 기록 모음 localStorage를 계정 메모로 자동 이관하거나 로그아웃 때 임의 삭제

## Verification Strategy
- **Test decision**: TDD. Node test + Vitest + Playwright/real browser E2E를 사용한다.
- **Privacy invariant**: 테스트 fixture/evidence에 실제 메모 본문을 넣지 않는다. `private-test-body-<random>` 형식의 무의미한 고정 문자열만 쓴다.
- **Evidence**: `.omo/evidence/private-memo-safe-wave/task-{N}-*.{tap,json,md,png}`. 어떤 증거에도 memo title/body, 쿠키, 인증 토큰, 개인 ID를 기록하지 않는다.
- **Baseline commands**: `npm.cmd test`, `npm.cmd --prefix frontend run type-check`, `npm.cmd --prefix frontend run build:check`, 그리고 태스크별 API/E2E 명령.

## Execution Strategy

### Parallel Execution Waves
| Wave | Tasks | Goal |
| --- | --- | --- |
| 1 | 1, 2, 3 | 저장소·암호화·재인증의 서버 계약을 먼저 고정한다. |
| 2 | 4, 5, 6 | 보호된 API/보존작업, 공개 경계, 팀 억제를 구현한다. |
| 3 | 7, 8 | 잠금 화면·메모 UX·모바일/공용기기 복구를 연결한다. |
| 4 | 9, 10 | 운영 준비와 실제 사용자 시나리오를 재현하고 출시 상태를 판정한다. |

### Dependency Matrix
| Task | Blocked By | Blocks |
| --- | --- | --- |
| 1. Private memo contract | none | 2, 3, 4, 5, 7, 9 |
| 2. Schema + crypto | 1 | 4, 5, 9 |
| 3. Recent reauthentication | 1 | 4, 7, 9 |
| 4. Owner-only memo API | 2, 3 | 5, 7, 8, 9 |
| 5. Retention/export/rollback | 2, 3, 4 | 9, 10 |
| 6. Public team/rights boundaries | 1 | 9, 10 |
| 7. Private memo UI | 3, 4 | 8, 9 |
| 8. Public/private IA hardening | 4, 6, 7 | 9, 10 |
| 9. Adversarial/security QA | 2-8 | 10 |
| 10. Release readiness | 5, 6, 8, 9 | F1-F4 |

## TODOs

- [x] 1. 개인 메모 v1 경계와 테스트 계약을 먼저 고정한다

  **What to do**:
  - 새 `docs/athletetime-private-memo-v1-contract.md`에 이 계획의 제품 결정, 데이터 금지 목록, 상태 전이, API 응답 코드, Korean UX 문구, 운영자 비열람 원칙을 단일 기준으로 문서화한다.
  - `backend/tests/private-memo-contract.test.js`를 먼저 RED로 만든다. 문서가 없을 때는 실패하고, 문서가 생긴 뒤에는 경계 자체를 검증하는 GREEN 정적 계약으로 전환한다. 실제 구현의 RED→GREEN 검증은 각각의 구현 태스크(2~5)에서 다시 수행한다. 이 테스트는 private memo 구현 파일·공개 API·공개 DTO·관리자/정정 흐름을 정적 스캔해 금지 필드와 공개 업로드 의존성을 막는다.
  - v1의 API 계약을 정확히 고정한다: `POST/GET /api/private-memos`, `GET/PATCH/DELETE /api/private-memos/:id`, `POST /api/private-memos/:id/restore`, `GET /api/private-memos/export`, `POST /api/auth/re-authenticate`.
  - 비회원의 memo item 요청은 401, 인증됐지만 잠긴 보관함은 403 `RECENT_AUTH_REQUIRED`, 존재하지 않거나 타인/삭제된 활성 메모는 동일 404 `MEMO_NOT_FOUND`, 잘못된 수정 버전은 409 `MEMO_VERSION_CONFLICT`로 결정한다. 오류 본문에 제목/본문/소유자 단서를 넣지 않는다.
  - 노출 문구는 `나만 볼 수 있는 개인 메모예요.`, `공용 기기라면 끝나고 로그아웃하세요.`, `30일 안에는 휴지통에서 되돌릴 수 있어요.`만 사용한다. E2E/운영자가 절대 열람 불가·종단간 암호화·공식 기록 연동을 암시하는 문구는 금지한다.

  **Must NOT do**:
  - 코드·DB·라우트를 이 태스크에서 구현하지 않는다.
  - 공개 선수, 팀, 종목, 출처, 요청 티켓을 메모의 v1 연결 대상으로 문서화하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 3, 4, 5, 6, 7 | Blocked By: none

  **References**:
  - Pattern: `docs/athletetime-private-vault-release-boundary.md` - 기존 공개/비공개 출시 경계를 보존한다.
  - Pattern: `docs/athletetime-persona-release-matrix.md` - 사용자·오류·모바일 기준을 계약으로 쓴다.
  - Pattern: `backend/tests/team-public-dto-boundary.test.js` - 금지 필드 재귀 스캔 방식을 따른다.
  - Pattern: `backend/tests/auth-security-readiness.test.js` - 인증 보안 문구와 정적 계약 테스트의 작성 방식을 따른다.

  **Acceptance Criteria**:
  - [x] 계약 문서에 제목/본문 암호화, 10분 재인증, 30일 복구, 계정 소유, 404 비공개, no-store, 무첨부가 모두 명시된다.
  - [x] 계약 테스트는 문서가 없을 때 RED, 문서만 추가한 뒤에는 GREEN이 된다. 구현 세부 동작을 요구하는 RED→GREEN 테스트는 태스크 2~5의 완료 조건으로 분리한다.
  - [x] 문서와 테스트에 `athleteKey`, `recordId`, `sourceId`, `attachment`, `Cloudinary`, `multipart`가 허용 필드로 나타나지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Contract completeness
    Tool: node --test
    Steps: Run backend/tests/private-memo-contract.test.js after adding only the specification.
    Expected: 문서가 없을 때 RED였던 테스트가 경계 문서 추가 뒤 GREEN이며, 실제 구현을 요구하지 않는다.
    Evidence: .omo/evidence/private-memo-safe-wave/task-1-contract-red.tap

  Scenario: Forbidden-surface scan
    Tool: rg + node --test
    Steps: Feed a fixture that includes attachment/sourceId/public URL vocabulary into the contract scanner.
    Expected: The scanner rejects the private-memo contract if public upload or public-record links appear.
    Evidence: .omo/evidence/private-memo-safe-wave/task-1-forbidden-red.tap
  ```

  **Commit**: YES | Message: `docs(memos): lock private memo v1 contract` | Files: `docs/athletetime-private-memo-v1-contract.md`, `backend/tests/private-memo-contract.test.js`, `package.json`

- [ ] 2. 암호화된 private_memos 스키마와 키 회전 경계를 구현한다

  **What to do**:
  - `backend/database/migration-008-private-memos.sql`을 추가한다. `private_memos`에는 `id UUID`, `user_id UUID REFERENCES users(id) ON DELETE CASCADE`, `ciphertext BYTEA`, `iv BYTEA`, `auth_tag BYTEA`, `key_version VARCHAR(32)`, `version INTEGER`, `created_at`, `updated_at`, `deleted_at`, `purge_after`만 둔다. 평문 `title`, `body`, `preview`, `athlete_key`, `record_id`, `source_id`, `attachment` 컬럼은 만들지 않는다.
  - `iv`는 12 byte, tag는 16 byte, `version >= 1`, `deleted_at`와 `purge_after`는 함께 null 또는 함께 값이라는 DB check constraint를 둔다. `(user_id, deleted_at, updated_at DESC)`와 `purge_after` 인덱스를 만든다.
  - `users`에 `memo_auth_epoch INTEGER NOT NULL DEFAULT 0`을 migration으로 추가한다. 이 값은 메모용 최근 재인증 쿠키를 비밀번호 변경/재설정 뒤 무효화하는 데만 쓴다.
  - `card-studio/services/privateMemoCrypto.js`를 새로 만들어 canonical JSON `{ payloadVersion: 1, title, body }`를 UTF-8 AES-256-GCM으로 암호화/복호화한다. AAD는 `private-memo:<memo-id>:<user-id>:<key-version>`으로 고정한다.
  - `PRIVATE_MEMO_ENCRYPTION_KEYS_JSON`은 JSON object, `PRIVATE_MEMO_ACTIVE_KEY_VERSION`은 object의 key 하나만 허용한다. 모든 key는 base64로 인코딩한 정확히 32 byte여야 한다. 활성 key로 암호화하고, 저장된 key version으로만 복호화한다.
  - `backend/database/private-memo-schema-contract.js`와 PostgreSQL 통합 테스트를 추가한다. migration runner가 008을 적용하고, 암호문 DB 행에는 실제 title/body test string이 없음을 검증한다.

  **Must NOT do**:
  - `DATA_RIGHTS_ENCRYPTION_KEY`, 공개 업로드 키, 기존 `posts/images/reports` 테이블을 재사용하지 않는다.
  - 키/암호문/IV/tag/테스트 본문을 로그·증거 파일·커밋 메시지에 출력하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 9 | Blocked By: 1

  **References**:
  - Pattern: `card-studio/services/dataRightsCrypto.js` - AES-256-GCM과 base64 32-byte 환경값 검증의 출발점이다. 키 이름/키 자체는 공유하지 않는다.
  - Pattern: `backend/database/migration-004-data-rights.sql` - BYTEA/IV/tag DB 제약의 기존 사용 예다.
  - Pattern: `backend/database/run-migrations.js` - checksum, transaction, migration 순서 계약을 따른다.
  - Pattern: `backend/tests/data-rights-postgres.integration.test.js` - TEST_DATABASE_URL 기반 통합 테스트 형태를 따른다.

  **Acceptance Criteria**:
  - [ ] `private_memos`에는 평문 content/공개 기록/첨부 컬럼이 없고, check/index/FK가 명세와 일치한다.
  - [ ] 동일 사용자·동일 memo id·동일 key version AAD로만 복호화되며 id/user/version을 바꾸면 인증 실패한다.
  - [ ] 키 설정이 없거나 malformed/unknown version이면 memo 기능은 503 `PRIVATE_MEMOS_UNAVAILABLE`로 fail-closed하고 DB를 변경하지 않는다.
  - [ ] migration을 두 번 실행해도 schema/ledger가 변하지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Encrypted persistence
    Tool: node --test with TEST_DATABASE_URL
    Steps: Apply migration; insert one memo through the crypto/repository fixture; query the row directly.
    Expected: Ciphertext/iv/tag/key_version exist; the test title and body are absent; decrypt succeeds only with the matching owner/id/version.
    Evidence: .omo/evidence/private-memo-safe-wave/task-2-encryption-postgres.tap

  Scenario: Tamper and missing-key failure
    Tool: node --test with TEST_DATABASE_URL
    Steps: Change AAD input or use an unavailable stored key version; rerun write/read paths.
    Expected: No plaintext response, no partial row update, deterministic unavailable/authentication error.
    Evidence: .omo/evidence/private-memo-safe-wave/task-2-crypto-failure.tap
  ```

  **Commit**: YES | Message: `feat(memos): add encrypted private memo schema` | Files: `backend/database/migration-008-private-memos.sql`, `backend/database/private-memo-schema-contract.js`, `card-studio/services/privateMemoCrypto.js`, `backend/tests/private-memo-*.test.js`

- [ ] 3. 최근 재인증 잠금과 세션 무효화 계약을 구현한다

  **What to do**:
  - `POST /api/auth/re-authenticate`를 `backend/auth/routes.js`에 추가한다. 이미 인증되고 이메일 인증된 계정의 현재 비밀번호만 bcrypt로 확인하며, 성공 시 `userId`, `memo_auth_epoch`, `purpose: private-memo`, 만료를 담은 `athletetime_recent_memo_auth` HttpOnly/Secure/SameSite=Lax cookie를 10분 발급한다.
  - 별도 `PRIVATE_MEMO_REAUTH_SECRET`을 production required 환경값으로 도입한다. 키가 없으면 reauth endpoint와 memo API는 503으로 fail-closed한다. access/refresh/data-rights crypto 키와 공유하지 않는다.
  - `backend/middleware/privateMemoAuth.js`에서 private memo API는 Authorization bearer 헤더를 거절하고 cookie auth + CSRF + `authenticateToken` + 이메일 확인 + memo-purpose recent auth를 모두 요구하게 한다. foreign/missing 리소스의 404와 잠긴 보관함의 403을 분리하되 그 외 메타데이터는 주지 않는다.
  - 비밀번호 재설정, 인증된 비밀번호 변경, 로그아웃에 `memo_auth_epoch` 증가/재인증 cookie clear를 추가한다. 변경 과정은 refresh token revoke의 현재 안전 계약을 약화하지 않는다.
  - 재인증에는 사용자+IP 기준 5회/15분 rate limit과 generic failure message를 둔다. 이전 입력의 password는 UI/서버 로그에 기록하지 않는다.

  **Must NOT do**:
  - 최근 재인증 proof를 localStorage/sessionStorage/URL/React query persistence에 저장하지 않는다.
  - 비밀번호 재설정 코드, 이메일 코드, 관리자 권한, OAuth 추정값을 recent-auth 우회 수단으로 쓰지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 7, 9 | Blocked By: 1

  **References**:
  - Pattern: `backend/utils/authCookies.js` - Secure HttpOnly cookie, CSRF helper, 쿠키 삭제 방식.
  - Pattern: `backend/middleware/auth.js` - `authenticateToken`, `requireEmailVerified` 서버 identity 기준.
  - Pattern: `backend/auth/routes.js` - password reset transaction, refresh token revoke, rate limiter usage.
  - Pattern: `backend/tests/auth-cookie-csrf.test.js` and `backend/tests/auth-recovery-hardening.test.js` - cookie/CSRF/recovery negative test patterns.

  **Acceptance Criteria**:
  - [ ] 잠긴 계정은 valid session이어도 memo list/read/write/export에서 403 `RECENT_AUTH_REQUIRED`를 받고, 성공한 재인증 뒤 10분 동안만 통과한다.
  - [ ] password reset, password change, logout 뒤 기존 recent-auth cookie는 즉시 효력이 없다.
  - [ ] cookie-auth memo write는 누락/틀린 CSRF에서 실패하고, bearer-only 시도도 실패한다.
  - [ ] 반복 실패는 user와 IP 모두에서 제한되며, 실패 응답·로그에 password/token/user email을 넣지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Unlock, expire, and revoke
    Tool: node --test + fake clock
    Steps: Login, call memo list, reauthenticate, advance 10 minutes, reset password, and retry after each step.
    Expected: Locked -> unlocked -> locked after expiry; reset and logout invalidate prior unlock even before nominal expiry.
    Evidence: .omo/evidence/private-memo-safe-wave/task-3-reauth-lifecycle.tap

  Scenario: CSRF/bearer/rate abuse
    Tool: node --test HTTP fixture
    Steps: Send cookie write without CSRF, bearer-only write, six invalid password challenges, then a valid challenge.
    Expected: CSRF/bearer fail closed; sixth challenge is 429; no response differentiates a secret or exposes password input.
    Evidence: .omo/evidence/private-memo-safe-wave/task-3-reauth-abuse.tap
  ```

  **Commit**: YES | Message: `feat(auth): add recent private memo reauth` | Files: `backend/auth/routes.js`, `backend/utils/authCookies.js`, `backend/middleware/privateMemoAuth.js`, `backend/tests/private-memo-auth.test.js`

- [ ] 4. 소유자 전용 private memo API와 비공개 저장소를 구현한다

  **What to do**:
  - `backend/repositories/privateMemoRepository.js`, `backend/services/privateMemoService.js`, `backend/routes/privateMemos.js`를 새로 만든다. SQL의 모든 item query는 `WHERE id = $1 AND user_id = $2`로 한 번에 범위를 제한하고 user id는 오직 `req.user.id`에서 받는다.
  - `src/server.js`에 `/api/private-memos`를 `/api/card-studio` 바깥의 인증 전용 라우트로 mount한다. `recordAnalyticsRoutes`, public routes, admin routes, chat/post/upload routes 어느 곳에도 import/mount하지 않는다.
  - create/update 입력은 JSON object `{ title, body, version? }`만 받는다. NFC 정규화, 제어문자 제거, 빈 문자열/80자 초과 title/12,000자 초과 body/200개 초과를 명시 오류로 처리하고 HTML을 HTML로 렌더하지 않는다.
  - list는 활성 메모만 최신순 50개씩, read/update/delete/restore는 item 단위, 휴지통 list는 명시 `state=deleted`만 사용한다. update/delete/restore에 version precondition을 강제한다.
  - private route의 모든 성공/실패 응답에 `Cache-Control: no-store, private`, `Pragma: no-cache`, generic JSON error envelope를 적용한다. list/health/admin의 memo counts와 updated timestamps도 공개 API로 만들지 않는다.
  - `backend/utils/privacyGuardLogger.js`, `frontend/src/lib/log.ts`, `src/requestLogPath.js`를 확장해 memo title/body, `private-memos/:id`, object value 형태의 메모 payload가 운영 로그에 남지 않게 한다. memo 서비스는 성공 로그를 남기지 않고, 오류는 code만 남긴다.
  - per-account write limiter와 per-IP limiter를 private router에 붙인다. 리스트/읽기에는 ID enumeration을 돕는 상세 실패 정보·서버 timing count를 반환하지 않는다.

  **Must NOT do**:
  - `posts`, `comments`, `images`, `reports`, card-studio analytics repository나 Cloudinary helper에 memo payload를 넣지 않는다.
  - 관리자에 본문/제목/개별 메모 목록을 제공하는 endpoint를 만들지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 7, 8, 9 | Blocked By: 2, 3

  **References**:
  - Pattern: `backend/routes/marketplace.js` - authenticated JSON CRUD의 route shape만 참고하고, public read/owner inference는 복사하지 않는다.
  - Pattern: `card-studio/repositories/postgresDataRightsRepository.js` - repository에서 사용자 범위와 저장 변환을 강제하는 참고점.
  - Pattern: `backend/utils/privacyGuardLogger.js` and `src/requestLogPath.js` - 운영 로그 경계를 확장할 위치.
  - Pattern: `backend/tests/auth-cookie-csrf.test.js` - cookie/CSRF negative HTTP test fixture.

  **Acceptance Criteria**:
  - [ ] User A는 자기 메모를 create/list/get/update/delete/restore만 할 수 있고, User B의 ID와 없는 ID는 status/body가 완전히 같은 404다.
  - [ ] private route는 cookie session+CSRF+recent auth를 모두 통과할 때만 데이터 응답을 낸다.
  - [ ] 모든 DB/HTTP/로그/URL/localStorage 테스트에서 title/body와 public-record identifiers가 0건이다.
  - [ ] `GET /api/private-memos`의 response는 cacheable하지 않고 query/body에서 `userId`, `athleteKey`, `recordId`, `sourceId`, attachment 값을 허용하지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Two-account non-disclosure
    Tool: node --test HTTP + PostgreSQL fixture
    Steps: User A creates one memo after reauth; User B and an unauthenticated client try list/get/patch/delete using A's id; request a random id too.
    Expected: A succeeds. B and random-id requests are indistinguishable 404 for item routes; unauthenticated list is 401; no body or owner metadata leaks.
    Evidence: .omo/evidence/private-memo-safe-wave/task-4-owner-boundary.tap

  Scenario: Plaintext/log/storage sweep
    Tool: node --test + rg fixture scan
    Steps: Send a unique synthetic body through create/update/failing validation paths; inspect response headers, captured logger args, browser storage, and route logs.
    Expected: The synthetic body/title appear only in authorized response memory; no URL, logger, local/session storage, static public DTO, or evidence artifact contains them.
    Evidence: .omo/evidence/private-memo-safe-wave/task-4-no-leak.tap
  ```

  **Commit**: YES | Message: `feat(memos): add owner-only encrypted memo API` | Files: `backend/repositories/privateMemoRepository.js`, `backend/services/privateMemoService.js`, `backend/routes/privateMemos.js`, `src/server.js`, `backend/utils/privacyGuardLogger.js`, `src/requestLogPath.js`, `backend/tests/private-memo-api.test.js`

- [ ] 5. 삭제·복구·내보내기·비활성화의 운영 수명주기를 구현한다

  **What to do**:
  - item delete와 optional delete-all은 plaintext/암호문을 반환하지 않고 `deleted_at = now`, `purge_after = now + 30 days`, `version = version + 1`만 수행한다. 삭제 후 기본 목록·직접 get은 404이며 휴지통 endpoint에서만 본인이 볼 수 있다.
  - restore는 `purge_after > now` and current version 조건에서만 복구한다. purge는 `purge_after <= now`인 행을 transaction으로 영구 DELETE하고 두 번 실행해도 결과가 같다.
  - `card-studio/services/contactPurgeScheduler.js`의 idempotent schedule pattern을 따라 `privateMemoPurgeScheduler`를 만들고, server boot에서 feature가 enabled and configured일 때만 1시간 간격으로 시작한다. purge 실패 로그는 count/body/id 없이 error code만 남긴다.
  - `GET /api/private-memos/export`는 recent auth 후 활성+복구 가능 메모를 한 번에 decrypt하여 JSON 다운로드로 stream한다. `Content-Disposition` filename에는 날짜만 쓰고 제목/사용자/ID를 넣지 않으며 no-store header와 `다운로드한 파일은 기기 다운로드 폴더에 남을 수 있어요.` 안내를 UI에 고정한다.
  - `PRIVATE_MEMOS_ENABLED=false`를 기본값으로 한다. false이거나 key/reauth/retention readiness가 불완전하면 private route는 404, UI/nav는 숨기고 기존 공개 기능은 그대로 동작한다. 암호화된 행을 삭제하거나 migration을 되돌리지 않는다.
  - `scripts/check-private-memo-readiness.js`와 운영 문서에 key versions, feature flag, purge enablement, encrypted backup retention `<= 35 days`, memo backup restore rehearsal 기록을 검사하는 fail-closed checklist를 추가한다.

  **Must NOT do**:
  - purge를 클라이언트 타이머, localStorage, 공개 cron route, 관리자 수동 본문 열람으로 구현하지 않는다.
  - 삭제를 `영구 삭제`라고 표시하면서 30일 복구함을 남기지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10 | Blocked By: 2, 3, 4

  **References**:
  - Pattern: `card-studio/services/contactPurgeScheduler.js` - timer unref와 idempotent scheduled work pattern.
  - Pattern: `card-studio/repositories/postgresRetention.js` - purge query와 retention unit-test structure.
  - Pattern: `docs/data-privacy-guardrails.md` - encrypted access-controlled backup maximum 35-day policy.
  - Pattern: `backend/tests/data-rights-rollout.test.js` - readiness/runbook fail-closed evidence convention.

  **Acceptance Criteria**:
  - [ ] 삭제 메모는 30일 전 정확한 version으로만 복구되고, 30일 뒤 ciphertext를 포함해 DB에서 사라진다.
  - [ ] export/restore/delete-all는 recent auth/no-store/owner/CSRF/rate-limit 규칙을 item CRUD와 동일하게 지킨다.
  - [ ] feature flag off 또는 readiness failure에서 public app, team API, auth, data requests는 정상이고 memo 기능만 존재를 노출하지 않는다.
  - [ ] production readiness script는 key parsing, active key version, reauth secret, scheduler flag, backup configuration 중 하나라도 비면 nonzero로 끝난다.

  **QA Scenarios**:
  ```text
  Scenario: Delete, restore, purge and export
    Tool: node --test with fake clock + PostgreSQL fixture
    Steps: Create a memo, delete it, confirm active get is 404, restore within 29 days, delete again, advance beyond 30 days, run purge twice, request export.
    Expected: Restore works only before deadline; purge is idempotent and leaves no row; export contains only owner's current permitted synthetic records with no-store headers.
    Evidence: .omo/evidence/private-memo-safe-wave/task-5-lifecycle.tap

  Scenario: Disabled/misconfigured rollback posture
    Tool: node --test + readiness script
    Steps: Start app with flag off, absent active key, absent reauth secret, and missing backup readiness one at a time.
    Expected: Memo UI/route are unavailable without leaking configuration; public records/team/correction flows remain healthy; readiness exits nonzero.
    Evidence: .omo/evidence/private-memo-safe-wave/task-5-readiness-failure.tap
  ```

  **Commit**: YES | Message: `feat(memos): add private memo retention controls` | Files: `card-studio/services/privateMemoPurgeScheduler.js`, `scripts/check-private-memo-readiness.js`, `docs/athletetime-private-memo-operations.md`, `backend/tests/private-memo-retention.test.js`

- [ ] 6. 팀 통계와 데이터 권리 흐름의 공개 경계를 더 단단히 잠근다

  **What to do**:
  - `teamDetailService`와 `teamStatisticsService`에서 신규 세부 통계가 나오기 직전, distinct public athlete key가 5명 미만인 `season × event × division` group을 `{ suppressed: true, message }`로만 변환한다. raw count, labels that re-identify, chart point, hidden sort value, source id를 보내지 않는다.
  - `backend/tests/team-public-dto-boundary.test.js`의 recursive forbidden keys에 `sourceId`, `source_id`, `memo`, `privateMemo`, `memoId`, `sortValue`, `athleteKeys`를 더하고 search/detail/chart/cache payload를 함께 검사한다.
  - team UI는 suppressed group을 `자료가 적어 세부 수치를 보여주지 않아요.`로만 표시하며, 팀의 선수 목록/개인 카드/자동 개인 검색/메모 진입점을 추가하지 않는다. team -> records 행동은 빈 검색 화면으로만 이동한다.
  - data request validation, public athlete detail, workspace correction links, admin request DTO에 memo field 또는 memo URL이 없음을 contract test로 고정한다. 지원/관리자는 public correction request만 보고 private memo subsystem을 호출하거나 열람할 수 없게 한다.
  - `AboutDataPage`/`DataRequestPage`에는 `모은 공개 기록 기준이며 모든 기록 또는 공식 이력이 아니에요.`와 최소 정보 안내를 short copy로 유지한다.

  **Must NOT do**:
  - 기존 팀 스냅샷의 aggregate 값을 개인 성적/공식 명단/공식 메달/팀 순위로 바꾸지 않는다.
  - memo health/count/content를 팀·정정·관리자 화면에 넣지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9, 10 | Blocked By: 1

  **References**:
  - Pattern: `card-studio/services/teamDetailService.js` - group summary와 response mapping을 수정할 실제 위치.
  - Pattern: `card-studio/services/teamStatisticsService.js` - team public snapshot and disclaimer pattern.
  - Pattern: `backend/tests/team-public-dto-boundary.test.js` and `backend/tests/team-performance-api.test.js` - public DTO/cache guard tests.
  - Pattern: `frontend/src/pages/DataRequestPage.tsx`, `card-studio/services/dataRequestValidation.js`, `card-studio/routes/adminRoutes.js` - public correction boundary.

  **Acceptance Criteria**:
  - [ ] 4명 이하 세부 그룹은 API/UI/cache/sort payload에서 숫자와 identifying hints가 0개이고, suppression message만 남는다.
  - [ ] 5명 이상 group은 defined aggregation을 유지하며 개인 이름/key/raw record/source id를 노출하지 않는다.
  - [ ] team/detail/search/admin/data-request response의 재귀 forbidden key 스캔이 새 memo/public source keys를 모두 차단한다.
  - [ ] team browse는 로그인 없이 가능하고 memo route/status는 team route에서 관찰되지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Small group suppression
    Tool: node --test service/API fixture
    Steps: Supply groups of 4 and 5 distinct public athlete keys across the same season/event/division.
    Expected: Four-person response has only suppressed flag/message and no numeric or sort/chart data; five-person response has aggregate metrics only.
    Evidence: .omo/evidence/private-memo-safe-wave/task-6-small-group.tap

  Scenario: Public correction isolation
    Tool: node --test HTTP/static contract
    Steps: Submit correction from public athlete/workspace context while memo-like fields and IDs are injected into query/body fixtures; inspect admin/detail responses.
    Expected: Unsupported memo data is rejected or ignored without persistence; no memo field can reach operator responses.
    Evidence: .omo/evidence/private-memo-safe-wave/task-6-public-isolation.tap
  ```

  **Commit**: YES | Message: `fix(privacy): harden team and data-rights boundaries` | Files: `card-studio/services/teamDetailService.js`, `card-studio/services/teamStatisticsService.js`, `frontend/src/features/team-performance/*`, `backend/tests/team-*.test.js`, `backend/tests/data-rights-*.test.js`

- [ ] 7. 잠긴 개인 보관함과 빠른 텍스트 메모 UX를 구현한다

  **What to do**:
  - `frontend/src/pages/PrivateMemoVaultPage.tsx`, `frontend/src/api/privateMemos.ts`, `frontend/src/features/private-memos/`를 추가하고 `/me/memos` route를 `RequireAuth` 뒤에 등록한다. public athlete/team/workspace URL에는 memo draft/id/body를 절대 넣지 않는다.
  - 화면은 상태를 세 개만 가진다: `잠김`(비밀번호 재확인), `보관함`(목록/새 메모), `편집`(저장/삭제/휴지통). 첫 화면은 `비공개 메모`, `나만 볼 수 있어요.`, `공용 기기라면 끝나고 로그아웃하세요.`와 `잠금 풀기` 한 행동만 보인다.
  - reauth 화면은 password input 한 개, 명확한 back action, 실패/429/네트워크의 짧은 recovery를 제공한다. 입력값을 URL/localStorage/sessionStorage/analytics/log에 저장하지 않고 submit 뒤 메모리에서 즉시 비운다.
  - 편집기는 첫 모바일 viewport에서 title/body/save 상태를 보여준다. explicit save만 제공하며 자동 저장·백그라운드 업로드·브라우저 persistence를 하지 않는다. 저장 중에는 중복 제출을 막고 실패 시 작성 중 React state를 유지한 채 `다시 저장` 하나만 제공한다.
  - list에는 본인만 보는 title과 updated date만 보이고 server-side search/filter/tag는 없다. body preview는 해당 화면에서 decrypt한 own data만 2줄 text truncation으로 그리고 `dangerouslySetInnerHTML`을 쓰지 않는다.
  - 삭제는 `휴지통으로 이동`, 휴지통은 `30일 남음`처럼 서버가 계산한 날짜만, restore는 `되돌리기`, export는 별도 confirm sheet로 표현한다. public record 선택/동명이인/팀/정정/커뮤니티를 메모 UI에 연결하는 CTA를 두지 않는다.
  - logout와 account screen에서 `로그아웃`은 recent auth lock을 끝내며 다음 사용자가 browser history로 back해도 memo content route가 다시 hydrate되지 않게 query cache를 clear한다.

  **Must NOT do**:
  - memo body/title/draft를 device-local record workspace, training log, compare tray, React Query persistence, clipboard 자동복사, shared link, browser title에 넣지 않는다.
  - 사진/파일 선택 control, public download card, admin/support CTA, AI summary를 추가하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8, 9 | Blocked By: 3, 4

  **References**:
  - Pattern: `frontend/src/components/layout/RequireAuth.tsx` and `frontend/src/context/AuthContext.tsx` - protected route and login-return UX.
  - Pattern: `frontend/src/features/record-workspace/components/StorageStatusNotice.tsx` - 짧고 truthfully degraded 상태를 알리는 UI.
  - Pattern: `frontend/src/features/record-workspace/components/WorkspaceRecoveryState.tsx` - loading/network/corrupt recovery action semantics.
  - Pattern: `frontend/src/pages/RecordWorkspaceManagerPage.tsx` - local-only list/rename/delete UI와 혼동하지 않도록 비교할 기존 화면.

  **Acceptance Criteria**:
  - [ ] 비회원은 `/me/memos`에서 login prompt 외 memo 목록/metadata를 보지 못하고, 로그인했지만 잠긴 사용자는 title/count도 보지 못한다.
  - [ ] memo editor의 입력 text는 reload/close 후 남지 않으며, network failure 동안 현재 React state에서만 남고 successful explicit save 뒤에는 서버 authorized response로만 갱신된다.
  - [ ] 375px에서 title/body/save/lock status와 error action이 horizontal scroll 없이 최소 44px 터치 target으로 동작하고 keyboard focus가 보인다.
  - [ ] logout/back/another account sequence에서 이전 계정 memo의 query cache/UI/DOM text가 전혀 보이지 않는다.

  **QA Scenarios**:
  ```text
  Scenario: Mobile private memo happy path
    Tool: Playwright real browser, 375x812
    Steps: Login as account A; open /me/memos; unlock; create a synthetic-text memo; edit; move to trash; restore; export; logout.
    Expected: Each transition has one clear primary action, no horizontal overflow/console error, and all content disappears after logout.
    Evidence: .omo/evidence/private-memo-safe-wave/task-7-mobile-happy.png

  Scenario: Shared device and network recovery
    Tool: Playwright route mocking
    Steps: Type unsaved text, force POST 503, retry, logout, login as account B, use browser Back, then reload.
    Expected: A's draft survives only in-memory through retry; B/back/reload never sees A's memo content; retry keeps the draft only until a successful save or page exit.
    Evidence: .omo/evidence/private-memo-safe-wave/task-7-shared-device-e2e.json
  ```

  **Commit**: YES | Message: `feat(memos): add private vault interface` | Files: `frontend/src/pages/PrivateMemoVaultPage.tsx`, `frontend/src/api/privateMemos.ts`, `frontend/src/features/private-memos/*`, `frontend/src/App.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/**/*.test.tsx`

- [ ] 8. 기록 허브의 문맥 전환을 짧고 분명하게 다듬는다

  **What to do**:
  - `/records`를 공용 탐색의 단일 입구로 유지하고, 첫 화면은 `이름 또는 소속으로 기록 찾기`, `기록 비교`, `팀 성적 보기`의 명확한 목적만 제공한다. 사용자 보관함은 기록 탐색의 하위 상태가 아니라 계정 메뉴의 별도 `비공개 메모`로만 진입한다.
  - athlete detail은 공개 기록 한 후보의 읽기 화면, workspace는 같은 이름 후보의 임시 검토 화면, comparison은 2~4명 나란히 읽는 화면, team은 공개 집계 화면으로 문맥 badge/header/back link를 통일한다.
  - team에서 개인으로는 blank records search로만 이동하고, team query/category/season, user workspace, memo route/state를 전달하지 않는다. public athlete detail에서도 memo create shortcut을 두지 않는다.
  - 같은 이름 후보는 그대로 구분하고, `같은 선수로 확인된 것은 아니에요.`를 유지한다. 다른 이름을 한 workspace에 저장하려 하면 comparison으로 보내며 public records ownership을 암시하는 `내 기록` 표현을 사용하지 않는다.
  - public hub, athlete, workspace, team, correction pages에 `모은 공개 기록 기준`, `빠진 자료가 있을 수 있어요`, `공식 이력/공식 순위가 아니에요.`를 필요한 위치에만 짧게 둔다. 긴 방어문·AI/법률 용어·숨겨진 실험 용어는 넣지 않는다.
  - mobile drawer/dialog, lazy page loading, route recovery는 focus restoration, `aria-live`, real-heading readiness checks를 유지한다. Open drawer focus trap and Escape restore contracts를 regression test로 확정한다.

  **Must NOT do**:
  - public record detail에 private memo content/status/count을 표시하거나, team dashboard를 individual roster/card surface로 바꾸지 않는다.
  - 새 “추천 선수”, 예시 선수, 가짜 기록/팀/메모 데이터를 넣지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9, 10 | Blocked By: 4, 6, 7

  **References**:
  - Pattern: `frontend/src/pages/RecordsPage.tsx` - URL-driven hub/browse/compare entry state.
  - Pattern: `frontend/src/components/records/RecordsHub.tsx`, `RecordsBrowseGateway.tsx` - teen-friendly first-use choices.
  - Pattern: `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx`, `RecordWorkspacePage.tsx` - public candidate vs workspace distinction.
  - Pattern: `frontend/src/features/team-performance/TeamPerformancePage.tsx` - team-only URL/back state.
  - Pattern: `backend/tests/records-flow-e2e.test.js`, `records-recovery-e2e.test.js`, `records-mobile-dock-e2e.test.js` - browser history, focus and mobile flow evidence.

  **Acceptance Criteria**:
  - [ ] public hub/team/athlete/workspace/compare/memo pages each have one unambiguous primary purpose and no automatic transfer of private state to a public context.
  - [ ] same-name/no-auto-merge, team aggregate-only, public-source/partial coverage, and local-record-collection wording contracts continue to pass.
  - [ ] browser Back/Forward/refresh restores only the relevant public URL state; memo page never exposes content through a shareable URL.
  - [ ] no fake sample player/team/memo strings remain in public first-use surfaces or fixtures used outside explicit tests.

  **QA Scenarios**:
  ```text
  Scenario: Teen first-use context journey
    Tool: Playwright real browser, 375px
    Steps: Start /records; search a same-name candidate; open one public profile; start comparison; return; browse one team; return; then open account memo vault.
    Expected: Every page has a new clear heading/back action; candidate records never merge; team has no player list; memo requires separate account unlock and carries no record/team state.
    Evidence: .omo/evidence/private-memo-safe-wave/task-8-teen-journey.json

  Scenario: Stale/deep-link recovery
    Tool: Playwright with bad athlete/team/workspace/memo URLs and delayed API responses
    Steps: Open each stale link, wait for lazy fallback to disappear, use the offered recovery action, then use browser Back/Forward.
    Expected: One truthful recovery action per error; no blank page/focus loss; no private text or foreign state in public URL/body.
    Evidence: .omo/evidence/private-memo-safe-wave/task-8-recovery-e2e.json
  ```

  **Commit**: YES | Message: `fix(records): clarify public and private contexts` | Files: `frontend/src/pages/RecordsPage.tsx`, `frontend/src/components/records/*`, `frontend/src/features/record-workspace/*`, `frontend/src/features/team-performance/*`, `backend/tests/records-*.test.js`

- [ ] 9. 공격자·공용기기·운영자 관점의 침투 회귀를 자동화한다

  **What to do**:
  - private memo API test matrix를 auth state (none/A/B/admin), recent auth (locked/valid/expired/revoked), object state (own/foreign/missing/deleted/purged), transport state (CSRF absent/invalid, rate limited, key unavailable), and concurrency state (fresh/stale version)로 작성한다.
  - query cache, DOM, browser storage, URL, logger, error responses, network request bodies, static team/public/admin DTOs를 unique synthetic marker scan으로 검사한다. marker는 execution 끝에 process memory 밖으로 evidence에 남기지 않는다.
  - XSS tests는 `<script>`, event handler, javascript URL 형태의 synthetic text를 저장/렌더하고 inert plain text로만 나타나는지 검증한다.
  - public/private route separation test는 private memo module에서 `upload`, `cloudinary`, `multer`, card-studio analytics router, public post/comment route import가 없음을 검사한다.
  - performance/resilience tests는 20개 concurrent save, stale version conflict, slow list/decrypt, purge retry, logout while fetch pending, storage blocked public workspace가 서로 간섭하지 않는지 확인한다.

  **Must NOT do**:
  - 실제 사용자 계정, 실제 메모, production token, private source/original file, external service 공격을 테스트에 사용하지 않는다.
  - test가 통과하도록 404/CSRF/rate limit/DTO contract를 완화하지 않는다.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 10 | Blocked By: 2, 3, 4, 5, 6, 7, 8

  **References**:
  - Pattern: `backend/tests/auth-cookie-csrf.test.js`, `backend/tests/privacy-guard-logger.test.js`, `backend/tests/data-request-rate-limit.test.js` - threat-specific negative tests.
  - Pattern: `backend/tests/team-public-dto-boundary.test.js` - recursive public payload scans.
  - Pattern: `backend/tests/records-recovery-e2e.test.js` and `records-mobile-dock-e2e.test.js` - real browser failure and narrow viewport fixtures.

  **Acceptance Criteria**:
  - [ ] every ownership/lock/object state pair has a deterministic status/body contract and all foreign/missing active item cases remain indistinguishable.
  - [ ] synthetic memo marker is absent from logs, evidence, URL, browser storage, public/team/admin/correction payloads, and unauthorized DOM.
  - [ ] XSS input remains text; rate/CSRF/key/version/timeout failures do not create or corrupt a memo.
  - [ ] global existing records/team/auth test suite remains green without changing unrelated fixture semantics.

  **QA Scenarios**:
  ```text
  Scenario: Adversarial matrix
    Tool: node --test HTTP + PostgreSQL fixture
    Steps: Execute the full state matrix for users A/B/admin/guest against own/foreign/missing/deleted/purged memo IDs with CSRF/reauth/key permutations.
    Expected: Only A + valid CSRF + valid recent auth can observe or mutate A's plaintext; all other permutations reveal no data and preserve DB consistency.
    Evidence: .omo/evidence/private-memo-safe-wave/task-9-adversarial-matrix.tap

  Scenario: Browser leak and XSS audit
    Tool: Playwright + captured console/network/storage inspection
    Steps: Save synthetic HTML-like text, navigate public pages, logout/login different user, inspect elements/storage/requests.
    Expected: Text is inert, restricted to authorized vault view, absent after logout, and never appears in public/UI/analytics transports.
    Evidence: .omo/evidence/private-memo-safe-wave/task-9-browser-leak-audit.json
  ```

  **Commit**: YES | Message: `test(memos): add adversarial privacy coverage` | Files: `backend/tests/private-memo-*.test.js`, `frontend/src/features/private-memos/*.test.tsx`, `backend/tests/private-memo-e2e.test.js`

- [ ] 10. 운영 준비, feature flag 배포, 복구 인수인계를 마무리한다

  **What to do**:
  - `docs/athletetime-private-memo-operations.md`에 environment variable names only, key rotation sequence, lost-key incident posture, 30-day purge monitoring, encrypted backup <=35 day assertion, no-content support policy, disable/rollback behavior, and incident contact escalation format을 문서화한다.
  - `.env.example`/deployment configuration에는 값 없이 `PRIVATE_MEMOS_ENABLED=false`, `PRIVATE_MEMO_ENCRYPTION_KEYS_JSON`, `PRIVATE_MEMO_ACTIVE_KEY_VERSION`, `PRIVATE_MEMO_REAUTH_SECRET`, `PRIVATE_MEMO_PURGE_ENABLED` 이름과 validation notes만 추가한다. 실제 secret은 Git, PR, test evidence에 넣지 않는다.
  - staging에서 migration -> readiness -> flag false smoke -> key config -> flag true smoke -> disabled rollback을 순서대로 자동 runbook으로 수행한다. production은 staging proof, full tests, key/backup/purge readiness, no public leak scan, operator acknowledgement가 모두 green일 때만 별도 승인 배포한다.
  - health는 private memo feature의 generic `disabled|ready|unavailable`만 낸다. memo count, key version, last error, owner data, purge details를 public health나 admin UI에 노출하지 않는다.
  - unchanged public release checks (`/records`, `/records/teams/:id`, `/data-request`, login/logout, mobile drawer)와 new private memo route를 live-like test server에서 함께 smoke한다.

  **Must NOT do**:
  - source code migration rollback을 production에서 자동 실행하거나 encrypted data를 삭제해 rollback하지 않는다.
  - feature flag true, readiness green, actual deployment의 결과를 테스트만으로 추정하거나 성공했다고 보고하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 5, 6, 8, 9

  **References**:
  - Pattern: `docs/data-rights-rollout-runbook.md` - backup, dry-run, stop-condition documentation style.
  - Pattern: `backend/tests/data-rights-rollout.test.js` - readiness/nonzero gate test style.
  - Pattern: `WORKFLOW.md` - service repository, Render/Netlify handoff rules.
  - Pattern: `docs/athletetime-private-vault-release-boundary.md` - public upload and operator non-access constraints.

  **Acceptance Criteria**:
  - [ ] fresh staging migration and all readiness checks run without plaintext/sensitive output; flag false/true/false transitions do not alter public data or expose memo contents.
  - [ ] runbook contains an explicit STOP condition for missing key, invalid active version, scheduler/backup failure, route no-store failure, or any private marker leak.
  - [ ] release handoff names exact commit, migration checksum, test commands, browser scenarios, environment variable names only, rollback posture, and open operational facts.
  - [ ] production enablement is blocked by automation until all conditions are objectively green.

  **QA Scenarios**:
  ```text
  Scenario: Staging activation and rollback
    Tool: runbook script against staging database/service
    Steps: Apply migration, run readiness with flag false, set staged key configuration, enable flag, create/delete synthetic memo, disable flag, repeat public smoke tests.
    Expected: Memo works only while ready+enabled; disable hides it without deleting ciphertext; records/team/correction/auth remain green throughout.
    Evidence: .omo/evidence/private-memo-safe-wave/task-10-staging-rollout.md

  Scenario: Readiness stop conditions
    Tool: node scripts/check-private-memo-readiness.js
    Steps: Exercise each missing/invalid env or purge/backup condition in an isolated environment.
    Expected: Each unsafe condition exits nonzero with a generic remediation code and no secret/content value.
    Evidence: .omo/evidence/private-memo-safe-wave/task-10-readiness-stop.tap
  ```

  **Commit**: YES | Message: `docs(ops): add private memo release gates` | Files: `docs/athletetime-private-memo-operations.md`, `.env.example`, `scripts/check-private-memo-readiness.js`, `backend/tests/private-memo-rollout.test.js`

## Final Verification Wave
- [ ] F1. Plan Compliance Audit

  Verify each implemented change maps to Tasks 1-10, all Must NOT rules remain true, and no deployment-recovery branch changes are folded into this feature. Run `git diff --check`, enumerate changed paths, and store a redacted checklist in `.omo/evidence/private-memo-safe-wave/f1-plan-compliance.md`.

- [ ] F2. Code Quality and Privacy Review

  Run an independent review of crypto/key parsing, owner query scoping, reauth revocation, migration idempotency, logging, rate limits, and all public DTOs. The reviewer must attempt to find plaintext title/body/ID leakage and reject release on any finding. Store only codes/paths/results in `.omo/evidence/private-memo-safe-wave/f2-privacy-review.md`.

- [ ] F3. Real Browser QA

  In a clean browser profile at 375px and desktop, execute: guest -> login -> reauth -> create -> edit -> conflict -> delete -> restore -> export -> logout -> second account -> public records/team/data request. Confirm loading fallback has disappeared before interacting, no console/page error occurs, and back/forward does not revive content. Store no screenshots or traces containing memo text.

- [ ] F4. Release Scope Fidelity Check

  Confirm feature flag defaults off, no photos/files/AI/search/sharing/record linking/admin reading shipped, no team detail below threshold leaks, and all staging readiness gates pass. Production remains disabled unless this checklist, all tests, and the release owner explicitly approve activation.

## Execution Ownership
| Work class | Suggested model | Tasks |
| --- | --- | --- |
| High-risk reasoning and security | Sol very high | 1, 2, 3, 5, 6, 9, F2, F4 |
| Backend/API integration | Terra high | 4, parts of 5, 10 |
| UI and deterministic tests | Terra medium | 7, 8, focused component/E2E fixtures |
| Operational approval | Service owner | Render secrets, backup retention confirmation, feature-flag activation only after F1-F4 |

## Commit Strategy
- Task 1: `docs(memos): lock private memo v1 contract`
- Task 2-3: `feat(auth): add private memo encryption and reauth gate`
- Task 4-6: `feat(memos): add owner-only private memo service`
- Task 7-8: `feat(memos): add private memo vault experience`
- Task 9-10: `test(release): harden private memo launch gates`
- Never use `git add .`; stage only task-owned paths. Do not merge the deployment-recovery branch into this work.

## Success Criteria
- All private-memo endpoint responses pass owner, reauth, CSRF, no-store, rate-limit, encryption, and non-disclosure tests.
- Browser tests prove a teen can lock/unlock, create, edit, delete/restore, export, recover from network failure, and log out at 375px without public/private cross-over.
- Team and public correction flows still contain no memo or individual private fields, including hidden sorting/caching fields.
- Production enablement fails closed until both encryption keys and purge/backup configuration are present, and the feature flag remains off until all gates pass.

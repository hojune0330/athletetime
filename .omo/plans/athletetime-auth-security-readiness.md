# AthleteTime Auth Security Readiness Plan

## TL;DR
> **Summary**: 회원가입, 로그인, 세션, 커뮤니티 활동, 개인정보 권리, 운영자 보안까지 실제 사용자 출시 전 신뢰 기준으로 재설계한다. 현재 개발 기준은 `2026-first-item` PR 브랜치이고, 마지막에 본체 `athletetime` 이식/병합 게이트를 둔다.
> **Deliverables**:
> - HttpOnly cookie 기반 세션/refresh 구조
> - CSRF 방어, auth/community rate limit, 안전한 reset/verification 코드
> - 개인정보 센터: 내 정보 보기, 내 활동 보기, 내 데이터 내보내기, 탈퇴/비활성화/삭제 요청
> - 커뮤니티 활동 보호: 새 글/댓글/마켓/업로드는 이메일 인증 계정 중심, legacy anonymous는 별도 처리
> - 관리자 보안: admin grant flow, 감사 로그, 운영 Q&A 연계
> - 보안 헤더, CORS, 로그 redaction, migration, QA 증거
> **Effort**: XL
> **Parallel**: YES - 6 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 8 -> Task 12 -> Final Verification

## Context

### Original Request
사용자는 "회원가입 및 로그인 그리고 보안사항에 대한 대규모 실사용 준비"를 요청했다. 특히 개인정보, 민감정보, 개인 활동 보호를 실제 사용자들이 신뢰하는 진짜 커뮤니티의 핵심으로 봤다.

### Target Root Decision
- Primary target: `C:/Users/SAMSUNG/Documents/2026 첫프젝/2026-first-item`
- Branch/PR context: `codex/athletetime-product-ux-refresh`, PR #2
- Deployment target after readiness: `C:/Users/SAMSUNG/Documents/2026 첫프젝/athletetime`
- Reason: `2026-first-item` already has stronger auth work, tests, data-rights contract, and operator guide. `athletetime` main is behind and still has insecure defaults such as JWT fallback and default admin secret.

### Current Evidence From Repo
- `backend/auth/routes.js:622-718`: login issues access and refresh tokens in JSON.
- `backend/auth/routes.js:729-817`: refresh rotation exists in `2026-first-item`.
- `backend/auth/routes.js:914-1001`: forgot-password reveals whether an email exists and logs reset codes.
- `backend/auth/routes.js:1255-1271`: `set-admin` is disabled if `ADMIN_SECRET_KEY` is unset in `2026-first-item`; the same route in `athletetime` still has a default secret.
- `frontend/src/api/client.ts:29-35`: access token is read from `localStorage` and sent as Bearer token.
- `frontend/src/context/AuthContext.tsx:79-89`: access and refresh tokens are stored in `localStorage`.
- `src/server.js:63-88`: CORS is custom and uses credentials with dev/sandbox broad allow.
- `card-studio/middleware/security.js:8-29`: security headers are minimal.
- `card-studio/middleware/rateLimiter.js:36-99`: limiter is memory-based and not wired to auth routes.
- `backend/routes/posts.js:308-363`: community posts accept `anonymousId`, author, password, optional Instagram, and log request body.
- `backend/tests/auth-public-routes.test.js`: existing backend HTTP test pattern.

### External Standards Checked
- OWASP Session Management Cheat Sheet: warns not to store JWT/session credentials in `localStorage` or `sessionStorage`, preferring `HttpOnly; Secure; SameSite` cookies or BFF.
- OWASP Authentication Cheat Sheet: login throttling, account lockout/backoff, and MFA guidance.
- OWASP Forgot Password Cheat Sheet: consistent message/timing for existing and non-existing accounts, secure single-use expiring tokens, and rate limiting.
- OWASP WSTG Cookie Attributes: strong cookie configuration with `__Host-` prefix, `Secure`, `HttpOnly`, `Path=/`, and `SameSite`.
- 개인정보보호위원회 guide list: current 2026.4 개인정보 처리방침 작성지침 and 2025.11 개인정보의 안전성 확보조치 기준 안내서 are relevant references.

### Metis Review Gaps Addressed
- Target-root drift resolved: implementation starts in `2026-first-item`; `athletetime` gets a separate porting gate.
- Auth model decided: browser auth migrates to HttpOnly cookies; non-browser Bearer compatibility is out of launch scope unless later needed.
- Anonymous community model decided: public reading remains open; new user-generated writing becomes account-bound and email-verified.
- Privacy center decided: self-service account privacy actions are launch-critical, not a nice-to-have.
- Rate limiting decided: auth/community limits must be route-specific and production-ready, not memory-only.
- Reset flow decided: no account enumeration, no secret logs, hashed codes/tokens, attempt counters.
- Acceptance criteria made concrete per task with RED -> GREEN tests and manual QA artifacts.

## Work Objectives

### Core Objective
Make AthleteTime safe enough for real users to register, log in, post, comment, upload, and manage their data while feeling that their account and activity are protected.

### Must Have
- Browser auth no longer stores access/refresh credentials in `localStorage` or `sessionStorage`.
- Refresh/session secrets are not stored plaintext in DB.
- Login, signup, verification, reset, posts, comments, uploads, and admin endpoints have abuse controls.
- Password reset and email verification do not leak account existence or codes through responses/logs.
- Account deletion/export exists and is separated from athlete-record correction/non-exposure requests.
- Admin privilege grant/revoke is not controlled by a public shared-secret endpoint.
- Privacy policy/UX explains what is public, what is private, what is retained, and how deletion/export works.
- All work is verified by test-first RED -> GREEN plus real HTTP/browser QA.

### Must NOT Have
- No `AI 검증`, `2차 창작이라 안전`, `무조건 합법`, 공식 랭킹/공식 DB framing.
- No secret, token, verification code, reset code, password, raw request body, or full email in logs.
- No default admin secret, default JWT secret, or production mock DB fallback.
- No anonymous writing expansion before privacy ownership rules are decided.
- No silent deletion of public athlete result records as part of account deletion.

### Data Classification
| Class | Examples | Launch Handling |
|---|---|---|
| Public record data | athlete result name, affiliation, record, competition | Existing data-rights flow. Not part of account deletion. |
| Account identity | email, nickname, password hash, admin status | Protected account data. Export/delete available. |
| Account activity | posts, comments, marketplace listings, uploads, votes, likes | Public/private status disclosed. Delete/anonymize per policy. |
| Security metadata | refresh sessions, IP, user-agent, login history, rate-limit events | Restricted internal use. Retention limits required. |
| Sensitive/prohibited | birth date, phone, address, resident ID, person_no, raw identity numbers | Do not collect for normal account/community use. |

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD using `node:test` HTTP integration for backend, Vitest/TypeScript checks for frontend, Playwright or in-app browser QA for user-facing flows.
- QA policy: Every task has at least one HTTP or browser scenario with saved artifact under `.omo/evidence/auth-security-readiness/`.
- Required evidence per implementation task:
  - RED output before implementation.
  - GREEN output after implementation.
  - Manual QA artifact from HTTP or browser.
  - Cleanup receipt: server stopped, ports closed, temp files removed.
- Reviewer gate: use `omo:review-work` or `codex-ultrawork-reviewer` after implementation because this is security-sensitive and touches more than three files.

## Execution Strategy

### Parallel Execution Waves
Wave 1: security contract, inventory, migrations, test scaffolding.
Wave 2: session/cookie/CSRF backend and frontend migration.
Wave 3: auth abuse controls, password reset, verification, admin grant.
Wave 4: privacy center, account deletion/export, community ownership.
Wave 5: security headers, CORS, logging, uploads, operational docs.
Wave 6: `athletetime` porting gate, full QA, PR update, external review.

### Dependency Matrix
| Task | Blocks | Blocked By |
|---|---|---|
| 1 Auth/privacy contract | 2,3,4,5,6,7,8,9,10,11,12 | none |
| 2 DB migrations | 3,4,5,6,8,9 | 1 |
| 3 Cookie session backend | 4,5,8,12 | 1,2 |
| 4 Frontend auth migration | 12 | 1,3 |
| 5 CSRF/CORS hardening | 12 | 1,3,4 |
| 6 Auth rate limits | 7,12 | 1,2 |
| 7 Reset/verification hardening | 12 | 1,2,6 |
| 8 Privacy center API | 9,12 | 1,2,3 |
| 9 Privacy center UI | 12 | 8 |
| 10 Community write protection | 12 | 1,2,3 |
| 11 Security headers/logging/uploads | 12 | 1 |
| 12 End-to-end QA and port gate | final | 3,4,5,6,7,8,9,10,11 |

## TODOs

- [ ] 1. Auth And Privacy Contract

  **What to do**: Create a canonical implementation contract document that defines auth transport, cookie names, CSRF strategy, session lifetimes, account states, data classes, privacy rights, retention periods, and what remains public after deletion.

  **Must NOT do**: Do not implement code in this task. Do not make legal guarantees. Do not call the service "fully compliant" or "legally safe".

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-12 | Blocked By: none

  **References**:
  - Pattern: `docs/data-privacy-guardrails.md` - existing data minimization framing.
  - Pattern: `docs/athletetime-data-strategy-master.md` - public record data is separate from account privacy.
  - External: OWASP Session Management Cheat Sheet - localStorage token warning and cookie/session model.
  - External: 개인정보보호위원회 2026.4 개인정보 처리방침 작성지침 - public privacy policy basis.

  **Acceptance Criteria**:
  - [ ] New document exists: `docs/athletetime-auth-privacy-security-contract.md`.
  - [ ] Contract states: browser credentials live only in HttpOnly cookies.
  - [ ] Contract states: account deletion does not delete public athlete result records; it handles account/community activity only.
  - [ ] Contract states: new posts/comments/marketplace/uploads require an authenticated email-verified account.
  - [ ] Contract states: legacy anonymous posts are handled by password/request workflow, not silently attached to accounts.
  - [ ] `rg -n "무조건 합법|2차 창작이라 안전|AI 검증|공식 DB|공식 랭킹" docs/athletetime-auth-privacy-security-contract.md` returns no hit.

  **QA Scenarios**:
  ```
  Scenario: Contract can be audited by grep
    Tool: bash
    Steps: rg -n "HttpOnly|CSRF|탈퇴|내보내기|보관|삭제|익명" docs/athletetime-auth-privacy-security-contract.md
    Expected: all listed concepts appear at least once
    Evidence: .omo/evidence/auth-security-readiness/task-1-contract-grep.txt

  Scenario: Forbidden framing is absent
    Tool: bash
    Steps: rg -n "무조건 합법|2차 창작이라 안전|AI 검증|공식 DB|공식 랭킹" docs/athletetime-auth-privacy-security-contract.md
    Expected: command exits 1 with no matches
    Evidence: .omo/evidence/auth-security-readiness/task-1-contract-forbidden-scan.txt
  ```

  **Commit**: YES | Message: `docs(auth): define privacy security contract` | Files: `docs/athletetime-auth-privacy-security-contract.md`

- [ ] 2. Database Migrations For Sessions, Codes, Privacy, And Audit

  **What to do**: Add explicit migrations for hashed refresh sessions, CSRF/session metadata, email verification attempts, password reset attempts, auth rate limits, privacy requests, account deletion queue, export jobs, and admin audit logs. Remove runtime `CREATE TABLE`/`ALTER TABLE` from auth routes during later tasks.

  **Must NOT do**: Do not store plaintext refresh tokens, verification codes, reset codes, or CSRF secrets.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,6,7,8 | Blocked By: 1

  **References**:
  - Pattern: `backend/database/migration-001-add-auth.sql` - existing schema style.
  - Pattern: `backend/utils/db.js` - mock DB must be extended for test coverage.
  - API: `refresh_tokens` existing table needs token hashing migration.

  **Acceptance Criteria**:
  - [ ] Migration file added, for example `backend/database/migration-002-auth-security-readiness.sql`.
  - [ ] `refresh_tokens` replacement uses `token_hash`, `family_id`, `rotated_from_id`, `last_used_at`, `revoked_reason`, `ip_address`, `user_agent`.
  - [ ] `auth_rate_limits` or equivalent supports account and IP keys.
  - [ ] `privacy_requests`, `account_export_jobs`, `account_deletion_jobs`, `admin_audit_logs` are defined.
  - [ ] Mock DB supports all new queries used by tests.
  - [ ] Tests fail before production code and pass after.

  **QA Scenarios**:
  ```
  Scenario: Migration text has no plaintext secret columns
    Tool: bash
    Steps: rg -n "token VARCHAR|code VARCHAR|reset_token VARCHAR" backend/database/migration-002-auth-security-readiness.sql
    Expected: no plaintext token/code columns for refresh/reset/verification secrets
    Evidence: .omo/evidence/auth-security-readiness/task-2-secret-column-scan.txt

  Scenario: Mock DB can boot with new schema paths
    Tool: HTTP call
    Steps: PORT=54xx NODE_ENV=development DATABASE_URL= JWT_SECRET=test node src/server.js, then curl -i http://127.0.0.1:54xx/health
    Expected: HTTP/1.1 200 and JSON status healthy
    Evidence: .omo/evidence/auth-security-readiness/task-2-health.txt
  ```

  **Commit**: YES | Message: `feat(auth): add security readiness schema` | Files: `backend/database/*`, `backend/utils/db.js`, tests

- [ ] 3. HttpOnly Cookie Session Backend

  **What to do**: Change login/register/verify-email/refresh/logout to set and clear `__Host-athletetime_access` and `__Host-athletime_refresh` or final chosen names as HttpOnly cookies. Store only refresh token hashes. Keep access token short-lived. Add refresh reuse detection that revokes the whole token family on replay.

  **Must NOT do**: Do not return accessToken or refreshToken in browser JSON responses. Do not accept refresh tokens from request body for browser auth after migration.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4,5,8,12 | Blocked By: 1,2

  **References**:
  - Current: `backend/auth/routes.js:705-710` returns tokens in JSON.
  - Current: `backend/auth/routes.js:729-817` refresh rotation exists but uses plaintext token lookup.
  - External: OWASP WSTG Cookie Attributes - `__Host-`, `Secure`, `HttpOnly`, `Path=/`, `SameSite`.

  **Acceptance Criteria**:
  - [ ] `POST /api/auth/login` response includes `Set-Cookie` with HttpOnly refresh/access cookies.
  - [ ] Login JSON body contains user and status but no raw accessToken/refreshToken.
  - [ ] `POST /api/auth/refresh` reads refresh cookie, rotates it, and does not accept browser body refresh token.
  - [ ] Reusing an old refresh token returns 401 and revokes token family.
  - [ ] `POST /api/auth/logout` clears cookies and revokes active session.
  - [ ] Existing admin route tests are updated to use cookie/session helper where appropriate.

  **QA Scenarios**:
  ```
  Scenario: Login sets secure cookies and no body tokens
    Tool: HTTP call
    Steps: curl -i -X POST http://127.0.0.1:54xx/api/auth/login -H "Content-Type: application/json" --data '{"email":"qa@example.com","password":"Password123!"}'
    Expected: Set-Cookie includes HttpOnly; body does not include accessToken or refreshToken
    Evidence: .omo/evidence/auth-security-readiness/task-3-login-cookie.txt

  Scenario: Refresh replay is blocked
    Tool: HTTP call
    Steps: capture first refresh cookie, call refresh twice with old cookie
    Expected: first refresh 200, second refresh 401 and family revoke marker exists in audit/log response test helper
    Evidence: .omo/evidence/auth-security-readiness/task-3-refresh-replay.txt
  ```

  **Commit**: YES | Message: `feat(auth): move browser sessions to http-only cookies` | Files: `backend/auth/*`, `backend/middleware/*`, `backend/utils/*`, tests

- [ ] 4. Frontend Auth Migration Away From localStorage

  **What to do**: Update `apiClient`, `AuthContext`, `Header`, `RegisterPage`, admin pages, and any token readers so browser requests use `withCredentials: true` and no longer read/write auth credentials in localStorage. Add a single refresh retry interceptor that handles `TOKEN_EXPIRED` once and avoids infinite loops.

  **Must NOT do**: Do not keep a hidden fallback that reads old tokens from localStorage after migration except for one-time cleanup.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,12 | Blocked By: 3

  **References**:
  - Current: `frontend/src/api/client.ts:29-35` reads localStorage token.
  - Current: `frontend/src/context/AuthContext.tsx:79-89` stores tokens.
  - Current: `frontend/src/components/layout/Header.tsx` also writes/removes tokens.
  - Current: `frontend/src/pages/RegisterPage.tsx:208-210` writes tokens.

  **Acceptance Criteria**:
  - [ ] `rg -n "accessToken|refreshToken|Authorization.*Bearer|localStorage\\.setItem\\('accessToken'|localStorage\\.getItem\\('accessToken'" frontend/src` returns no auth credential storage hit.
  - [ ] `apiClient` uses `withCredentials: true`.
  - [ ] 401 `TOKEN_EXPIRED` triggers exactly one refresh retry.
  - [ ] Logout clears UI state even if server logout fails.
  - [ ] Browser QA confirms refresh survives page reload without localStorage auth tokens.

  **QA Scenarios**:
  ```
  Scenario: Browser login uses cookies only
    Tool: browser use
    Steps: open /login or login modal, sign in with QA account, inspect localStorage keys and document.cookie visibility
    Expected: no accessToken/refreshToken in localStorage; authenticated UI appears
    Evidence: .omo/evidence/auth-security-readiness/task-4-browser-login.png and task-4-browser-login-log.json

  Scenario: Expired access refreshes once
    Tool: HTTP call or Playwright route
    Steps: force short access TTL, login, wait/force expiry, request /api/auth/me
    Expected: one refresh call, then /me succeeds; no infinite loop
    Evidence: .omo/evidence/auth-security-readiness/task-4-refresh-retry.json
  ```

  **Commit**: YES | Message: `feat(auth): use cookie-backed frontend session` | Files: `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, auth UI/pages/admin callers, tests

- [ ] 5. CSRF And Production CORS Hardening

  **What to do**: Add CSRF protection for cookie-authenticated state-changing requests. Decide implementation as double-submit token or server-issued CSRF endpoint. Lock production CORS to explicit origins and credentials. Keep development preview origins safe but not production-wide.

  **Must NOT do**: Do not rely only on SameSite for state-changing actions. Do not allow `*` with credentials in production.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12 | Blocked By: 3,4

  **References**:
  - Current: `src/server.js:63-88` custom CORS with credentials.
  - Current: browser auth will use cookies after Task 3/4.
  - External: OWASP Session Management and WSTG cookie attributes.

  **Acceptance Criteria**:
  - [ ] Mutating requests without CSRF token return 403.
  - [ ] Valid same-origin CSRF token requests succeed.
  - [ ] Production CORS allows only configured `ATHLETETIME_ALLOWED_ORIGINS`.
  - [ ] CORS preflight for an unknown production origin does not include `Access-Control-Allow-Origin`.
  - [ ] Tests cover allowed origin, denied origin, missing token, invalid token, valid token.

  **QA Scenarios**:
  ```
  Scenario: CSRF blocks cross-site mutation
    Tool: HTTP call
    Steps: curl -i -X POST http://127.0.0.1:54xx/api/marketplace -H "Origin: https://evil.example" --cookie qa.cookies --data '{}'
    Expected: HTTP 403 and no mutation
    Evidence: .omo/evidence/auth-security-readiness/task-5-csrf-block.txt

  Scenario: Production CORS denies unknown origin
    Tool: HTTP call
    Steps: NODE_ENV=production ATHLETETIME_ALLOWED_ORIGINS=https://athletetime.com curl -i -X OPTIONS with Origin:https://evil.example
    Expected: no Access-Control-Allow-Origin for evil origin
    Evidence: .omo/evidence/auth-security-readiness/task-5-cors-deny.txt
  ```

  **Commit**: YES | Message: `feat(security): enforce csrf and production cors` | Files: `src/server.js`, middleware, frontend client, tests

- [ ] 6. Auth And Community Abuse Rate Limits

  **What to do**: Add route-specific limits for login, register, email verification send/verify, resend, forgot password, reset verify, reset password, posts, comments, marketplace writes, uploads, and admin actions. Use DB-backed or pluggable storage for production, memory fallback only for development tests.

  **Must NOT do**: Do not rely on IP-only limits for account attacks. Do not let admin skip abuse controls for sensitive admin actions.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7,12 | Blocked By: 1,2

  **References**:
  - Current: `card-studio/middleware/rateLimiter.js:36-99` memory limiter pattern.
  - Current: `src/server.js:187-188` mounts auth router without limiter.
  - External: OWASP Authentication Cheat Sheet login throttling.

  **Acceptance Criteria**:
  - [ ] Login is limited by account key and IP key.
  - [ ] Verification/reset code routes have tighter limits and attempt counters.
  - [ ] Community write routes have per-account and per-IP limits.
  - [ ] Upload routes have per-account limits and file-size constraints.
  - [ ] 429 responses include `Retry-After` and do not reveal account existence.
  - [ ] Limits work across two server instances when using production DB store.

  **QA Scenarios**:
  ```
  Scenario: Wrong password attempts are throttled
    Tool: HTTP call
    Steps: loop 6 login attempts for same email/IP with wrong password
    Expected: final attempt returns 429 with Retry-After
    Evidence: .omo/evidence/auth-security-readiness/task-6-login-rate-limit.txt

  Scenario: Comment spam is throttled
    Tool: HTTP call
    Steps: create QA session then POST comments over the configured threshold
    Expected: 429 after threshold, earlier comments succeed
    Evidence: .omo/evidence/auth-security-readiness/task-6-comment-rate-limit.txt
  ```

  **Commit**: YES | Message: `feat(security): add auth community rate limits` | Files: middleware/routes/tests/migrations

- [ ] 7. Password Reset And Email Verification Hardening

  **What to do**: Replace 6-digit plaintext stored codes with hashed, single-use, expiring challenge records. Normalize responses for existing and non-existing emails. Remove code logging. Add per-email/IP attempt counters and max attempts. Invalidate all sessions after password reset.

  **Must NOT do**: Do not reveal whether an email exists. Do not log codes even in development unless behind an explicit test-only transport that never runs in production.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 2,6

  **References**:
  - Current: `backend/auth/routes.js:940-944` forgot-password returns 404 for unknown account.
  - Current: `backend/auth/routes.js:982-986` logs reset code.
  - Current: `backend/auth/routes.js:111-119` logs verification code.
  - External: OWASP Forgot Password Cheat Sheet.

  **Acceptance Criteria**:
  - [ ] Existing and non-existing forgot-password requests return same status/body shape and similar timing.
  - [ ] Verification/reset secrets are hashed at rest.
  - [ ] Wrong code attempts lock the challenge after threshold.
  - [ ] Successful reset marks challenge used and revokes all sessions.
  - [ ] Captured stdout/stderr contains no raw verification/reset code.

  **QA Scenarios**:
  ```
  Scenario: Forgot password does not enumerate accounts
    Tool: HTTP call
    Steps: POST /api/auth/forgot-password for existing and non-existing emails
    Expected: same status and same public message
    Evidence: .omo/evidence/auth-security-readiness/task-7-no-enumeration.txt

  Scenario: No code leaks to logs
    Tool: tmux
    Steps: start server in tmux, request verification/reset code, capture pane
    Expected: no 6-digit code pattern tied to email appears
    Evidence: .omo/evidence/auth-security-readiness/task-7-log-redaction.txt
  ```

  **Commit**: YES | Message: `fix(auth): harden verification and reset flows` | Files: `backend/auth/routes.js`, token/code service, tests

- [ ] 8. Account Privacy Center API

  **What to do**: Add authenticated APIs for privacy summary, active sessions, revoke session, export my data, start account deletion, cancel pending deletion, and anonymize/delete own community activity according to contract.

  **Must NOT do**: Do not let account deletion remove public athlete result records. Do not expose another user's posts, comments, IPs, email, or security metadata.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 9,12 | Blocked By: 1,2,3

  **References**:
  - Current: `backend/auth/routes.js:853-909` `/me` returns account data.
  - Current: `frontend/src/api/dataRequests.ts` handles record correction requests, not account privacy.
  - Pattern: `card-studio/routes/adminRoutes.js` protected admin route style.

  **Acceptance Criteria**:
  - [ ] `GET /api/account/privacy-summary` returns only own account, activity counts, retention, and rights links.
  - [ ] `GET /api/account/export` returns own email/nickname/profile/activity, not password hashes, tokens, IPs, or other users.
  - [ ] `POST /api/account/deletion-request` creates pending deletion and revokes future writes.
  - [ ] `POST /api/account/sessions/:id/revoke` revokes a selected session.
  - [ ] `POST /api/account/sessions/revoke-all` revokes all other sessions.
  - [ ] Admin audit log records privacy actions without raw sensitive data.

  **QA Scenarios**:
  ```
  Scenario: User exports own data only
    Tool: HTTP call
    Steps: create two users, create content for both, call /api/account/export as user A
    Expected: export includes user A only and no token/password/IP fields
    Evidence: .omo/evidence/auth-security-readiness/task-8-export-own-data.txt

  Scenario: Deletion request locks account writes
    Tool: HTTP call
    Steps: create user, start deletion request, attempt new post/comment
    Expected: deletion request 202, subsequent write 403 or policy-specific blocked status
    Evidence: .omo/evidence/auth-security-readiness/task-8-deletion-write-block.txt
  ```

  **Commit**: YES | Message: `feat(account): add privacy center api` | Files: `backend/routes/accountPrivacy.js`, server mount, migrations, tests

- [ ] 9. Account Privacy Center UI

  **What to do**: Add a user-facing privacy center page with clear sections: account info, public activity, active sessions, data export, deletion/deactivation, privacy policy, and contact/request path. Keep tone calm and concrete.

  **Must NOT do**: Do not show internal operator runbook details. Do not promise instant permanent deletion.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 8

  **References**:
  - Pattern: `frontend/src/pages/ProfilePage.tsx` existing profile layout.
  - Pattern: `frontend/src/pages/AboutDataPage.tsx` public trust copy.
  - Pattern: `frontend/src/pages/admin/AdminOperatorGuidePage.tsx` protected API-fed page style.

  **Acceptance Criteria**:
  - [ ] Route added, for example `/account/privacy`.
  - [ ] Logged-out users are prompted to log in, then returned after login.
  - [ ] Page shows active sessions and revoke controls.
  - [ ] Page has export and deletion request actions.
  - [ ] Page copy explains public vs private activity in short Korean.
  - [ ] No forbidden legal/AI/safety framing.

  **QA Scenarios**:
  ```
  Scenario: Privacy center renders for logged-in user
    Tool: browser use
    Steps: login as QA user, open /account/privacy
    Expected: account summary, sessions, export, deletion controls visible
    Evidence: .omo/evidence/auth-security-readiness/task-9-privacy-center.png

  Scenario: Logged-out privacy center prompts login
    Tool: browser use
    Steps: clear cookies, open /account/privacy
    Expected: login modal or /login appears, no private data shown
    Evidence: .omo/evidence/auth-security-readiness/task-9-privacy-center-logged-out.png
  ```

  **Commit**: YES | Message: `feat(account): add privacy center ui` | Files: frontend account pages, routes, API client, tests

- [ ] 10. Community Write Protection And Ownership Model

  **What to do**: Require authenticated email-verified accounts for new posts, comments, marketplace listings, marketplace comments, uploads, and chat writes if applicable. Preserve public read. Define legacy anonymous handling: existing anonymous content remains public unless deleted/blinded by existing password or request workflow.

  **Must NOT do**: Do not silently merge anonymous IDs into new accounts. Do not expose user email in post/comment public responses.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 1,2,3

  **References**:
  - Current: `backend/routes/posts.js:308` uses `optionalAuth`.
  - Current: `backend/routes/comments.js:23` does not require auth.
  - Current: `backend/routes/marketplace.js:228` already requires auth for listings.
  - Current: `frontend/src/utils/anonymousUser.ts` stores local anonymous ID.

  **Acceptance Criteria**:
  - [ ] New posts/comments require authenticated email-verified user.
  - [ ] Public responses expose nickname/display name, not email.
  - [ ] Legacy anonymous delete/edit still works by existing password where present.
  - [ ] Write forms show login prompt, not a raw 401.
  - [ ] Anonymous localStorage IDs are no longer used for new server writes.
  - [ ] Existing read-only community pages keep working.

  **QA Scenarios**:
  ```
  Scenario: Anonymous post write is blocked gracefully
    Tool: HTTP call
    Steps: POST /api/posts without cookies
    Expected: HTTP 401 with Korean login-required message and no row created
    Evidence: .omo/evidence/auth-security-readiness/task-10-anon-post-block.txt

  Scenario: Email-verified account can post
    Tool: browser use
    Steps: login verified QA user, create community post
    Expected: post appears with nickname, not email
    Evidence: .omo/evidence/auth-security-readiness/task-10-verified-post.png
  ```

  **Commit**: YES | Message: `feat(community): require verified accounts for writes` | Files: community routes, frontend forms, tests

- [ ] 11. Security Headers, Logging Redaction, Upload Guards

  **What to do**: Strengthen security headers with CSP report-only first, HSTS in production, Permissions-Policy, modern Referrer-Policy, and remove deprecated X-XSS-Protection reliance. Add centralized logger redaction for emails, tokens, cookies, codes, passwords, request bodies, file names when sensitive. Add upload file magic sniffing, size limits, image-only allowlist, Cloudinary delete path, and metadata policy.

  **Must NOT do**: Do not add a CSP that breaks the current app without report-only measurement first. Do not log raw request bodies.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 12 | Blocked By: 1

  **References**:
  - Current: `card-studio/middleware/security.js:8-29` minimal headers.
  - Current: `src/server.js:101-109` global request logger.
  - Current: `backend/routes/posts.js:326-328` logs request body.
  - Current: `backend/routes/upload.js` logs file metadata.

  **Acceptance Criteria**:
  - [ ] API responses include `Cache-Control: no-store`.
  - [ ] HTML responses include CSP report-only or enforced policy as decided.
  - [ ] Production responses include HSTS.
  - [ ] Captured logs from auth/post/upload QA contain no raw email, code, password, token, cookie, or full request body.
  - [ ] Upload rejects disallowed MIME/magic bytes and oversized files.
  - [ ] Cloudinary delete helper is covered for account/content deletion.

  **QA Scenarios**:
  ```
  Scenario: Security headers are present
    Tool: HTTP call
    Steps: curl -i http://127.0.0.1:54xx/
    Expected: CSP, Referrer-Policy, X-Content-Type-Options, and production HSTS when NODE_ENV=production
    Evidence: .omo/evidence/auth-security-readiness/task-11-security-headers.txt

  Scenario: Sensitive logs are redacted
    Tool: tmux
    Steps: start server, submit auth/post/upload requests with test email/password/code-like values, capture pane
    Expected: captured logs contain redacted placeholders and no raw secrets
    Evidence: .omo/evidence/auth-security-readiness/task-11-redacted-logs.txt
  ```

  **Commit**: YES | Message: `feat(security): harden headers logs uploads` | Files: security middleware, routes, upload middleware, tests

- [ ] 12. Main `athletetime` Porting And Launch Gate

  **What to do**: After `2026-first-item` passes all security readiness tests, compare it with `C:/Users/SAMSUNG/Documents/2026 첫프젝/athletetime`, list drift, port changes or open a dedicated PR, and prove the deployed/main target has no insecure fallback.

  **Must NOT do**: Do not assume `2026-first-item` fixes automatically exist in `athletetime`. Do not merge without re-running auth/security QA against the final target.

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: final | Blocked By: 3-11

  **References**:
  - Drift: `athletetime/backend/utils/jwt.js:7` has default JWT secret fallback.
  - Drift: `athletetime/backend/auth/routes.js:1146` has default `athletetime-admin-2024`.
  - Current good target: `2026-first-item/backend/utils/jwt.js` and `2026-first-item/backend/auth/routes.js` have safer defaults.

  **Acceptance Criteria**:
  - [ ] Drift report exists: `.omo/evidence/auth-security-readiness/athletetime-port-drift.md`.
  - [ ] `athletetime` has no default JWT secret, no default admin secret, no localStorage auth token storage.
  - [ ] `athletetime` test suite or ported test suite passes.
  - [ ] Deployed/preview QA passes login, refresh, logout, privacy center, blocked CSRF, rate limit, and no-code-log scenarios.
  - [ ] PR comment reports readiness, remaining risk, and rollback steps.

  **QA Scenarios**:
  ```
  Scenario: Main repo insecure defaults are gone
    Tool: bash
    Steps: rg -n "your-super-secret-jwt-key-change-this-in-production|athletetime-admin-2024|localStorage\\.setItem\\('accessToken'" C:/Users/SAMSUNG/Documents/2026\\ 첫프젝/athletetime
    Expected: no matches after port
    Evidence: .omo/evidence/auth-security-readiness/task-12-main-forbidden-scan.txt

  Scenario: Final deployed auth journey works
    Tool: browser use
    Steps: open preview/prod URL, register/login, reload, open privacy center, logout
    Expected: authenticated state persists via cookies; logout clears state; no tokens in localStorage
    Evidence: .omo/evidence/auth-security-readiness/task-12-final-browser-auth.png
  ```

  **Commit**: YES | Message: `chore(security): verify athletetime launch readiness` | Files: drift report, target repo changes or PR notes

## Final Verification Wave
> ALL must APPROVE before launch-ready is claimed.

- [ ] F1. Plan Compliance Audit
  - Verify every task has RED -> GREEN proof and manual QA artifact.
  - Command: `test -d .omo/evidence/auth-security-readiness && rg -n "RED|GREEN|PASS" .omo/evidence/auth-security-readiness`

- [ ] F2. Code Quality Review
  - Run `npm test`.
  - Run `npm --prefix frontend run type-check`.
  - Run `npm --prefix frontend run build`.
  - Run targeted `node --check` on touched backend JS.

- [ ] F3. Security Regression Scan
  - Run forbidden secret scan:
    `rg -n "accessToken|refreshToken|localStorage\\.setItem\\('accessToken'|your-super-secret-jwt-key-change-this-in-production|athletetime-admin-2024|verificationCode.*console|reset.*console|password.*console|req\\.body" backend frontend/src src card-studio`
  - Expected: only allowed test fixtures or explicit non-secret references remain.

- [ ] F4. Real Manual QA
  - Browser: register/login/reload/logout/privacy-center.
  - HTTP: CSRF blocked, rate limit, reset no enumeration, security headers.
  - tmux: server logs contain no secrets.

- [ ] F5. Reviewer Gate
  - Spawn `codex-ultrawork-reviewer` or use `omo:review-work` with plan, diff, tests, evidence.
  - Treat every reviewer issue as real.
  - Repeat until unconditional approval.

## Commit Strategy
- One logical commit per wave.
- Use Conventional Commits.
- Do not commit until implementation work begins and user has authorized execution.
- Suggested final footer for implementation commits: `Plan: .omo/plans/athletetime-auth-security-readiness.md`

## Success Criteria
- Users can sign up and log in without browser-readable auth tokens.
- Users can see and control their account sessions.
- Users can export account/activity data.
- Users can request deletion/deactivation with clear consequences.
- New community writes are tied to verified accounts.
- Login/reset/verification cannot be abused easily or used for account enumeration.
- Admin privilege cannot be granted through default/shared-secret public backdoor.
- Logs, headers, CORS, uploads, and privacy pages pass security QA.
- `2026-first-item` and final `athletetime` target are both verified before public launch.

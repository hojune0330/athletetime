AthleteTime auth/security readiness Wave 1.
Objective: implement the first launch-blocking security wave from .omo/plans/athletetime-auth-security-readiness.md in C:/Users/SAMSUNG/Documents/2026 첫프젝/2026-first-item.
Deliverables:
1. Add docs/athletetime-auth-privacy-security-contract.md defining browser auth credentials as HttpOnly cookie-only, CSRF required, no localStorage auth credential storage, public athlete records separate from account deletion, new community writes requiring authenticated email-verified accounts, no legal overpromise.
2. Add RED->GREEN backend regression tests that lock immediate launch blockers: forgot-password must not enumerate accounts, auth code/reset code logs must not leak raw codes, set-admin default/shared-secret backdoor remains disabled when ADMIN_SECRET_KEY is missing, and public auth responses do not expose unsafe production defaults.
3. Patch the smallest backend code needed for those tests: no reset/verification code logging, uniform forgot-password public response for unknown email, no runtime secret leakage.
4. Run manual QA through HTTP/tmux against the real server and save artifacts under .omo/evidence/auth-security-readiness/.
5. Do not yet migrate full localStorage auth to HttpOnly cookies in this wave; leave that for Wave 2, but document it as the binding contract.
Success criteria:
C001 HTTP happy/regression: POST /api/auth/forgot-password for existing and non-existing email returns the same public status/body shape; evidence .omo/evidence/auth-security-readiness/wave1-forgot-password-no-enumeration.txt.
C002 tmux adversarial log check: send verification/reset requests and captured server logs contain no raw 6-digit codes or email->code pairs; evidence .omo/evidence/auth-security-readiness/wave1-no-code-log.txt.
C003 HTTP regression: POST /api/auth/set-admin without ADMIN_SECRET_KEY and with old default key returns 403 and no admin grant; evidence .omo/evidence/auth-security-readiness/wave1-set-admin-disabled.txt.
C004 CLI/document regression: contract file contains HttpOnly, CSRF, 탈퇴, 내보내기, 보관, 삭제, 익명; forbidden framing scan has no unsafe promise except in Must NOT Have context; evidence .omo/evidence/auth-security-readiness/wave1-contract-scan.txt.
Verification: tests must be written before production patches and captured RED->GREEN. Run npm test, frontend type-check/build if frontend touched, and node --check on changed JS.

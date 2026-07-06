AthleteTime auth/security readiness Wave 2.

Objective:
Move the main authentication path from browser localStorage bearer tokens toward HttpOnly/SameSite cookie sessions with CSRF protection.

Binding scope:
- Backend must issue HttpOnly access/refresh cookies on login/register/verify-email/refresh.
- Backend auth middleware must accept access token from HttpOnly cookie as well as legacy Authorization bearer during migration.
- Backend refresh/logout must accept refresh token from HttpOnly cookie.
- Backend must expose a CSRF token endpoint and require CSRF for cookie-authenticated unsafe auth writes in this wave.
- Frontend API client must send credentials and CSRF header for unsafe requests.
- Main AuthContext path must not require localStorage tokens to fetch current user, login, logout, or verify email.
- Avoid broad UI/copy work while Claude/Opus review is ongoing.

Out of scope for this wave unless trivial:
- Complete removal of all non-auth localStorage usage.
- AdminCardStudioPage bearer-token migration if it requires a larger admin API rewrite.
- Visual redesign.

Success criteria:
1. Cookie session happy path:
   Automated RED->GREEN: backend test proves login sets HttpOnly access/refresh cookies and /api/auth/me works with Cookie and no Authorization header.
   Manual QA: HTTP call against live server captures Set-Cookie and cookie-authenticated /api/auth/me 200.
2. CSRF protection:
   Automated RED->GREEN: backend test proves cookie-authenticated logout/profile write without X-CSRF-Token is 403, and with token succeeds.
   Manual QA: HTTP calls capture /api/auth/csrf-token, missing CSRF 403, valid CSRF success.
3. Frontend main-path migration:
   Automated RED->GREEN: source/behavior test proves frontend auth client no longer stores auth tokens in localStorage for main login/register/verify/logout/getMe path and axios uses withCredentials.
   Manual QA: browser or HTTP+static source artifact proves frontend built bundle/source path uses cookie credentials and no accessToken localStorage writes in main auth files.
4. Regression:
   Existing auth-public-routes, auth-security-readiness, operator-guide, data-rights tests remain green.
   Manual QA cleanup receipt: no live QA server/process left behind, no raw tokens/passwords stored in evidence.

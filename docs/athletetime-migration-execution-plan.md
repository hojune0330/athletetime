# AthleteTime Migration Execution Plan

> Status: execution plan only. No migration code before this document.
> Source decision: `docs/athletetime-deployment-target.md` section 4.
> Goal: move the production service from the legacy `athletetime` stack to the new unified AthleteTime service without losing community data, shared links, chat continuity, or production secrets discipline.

## 1. Legacy PostgreSQL Data Mapping

The old production service already holds real user data. Treat it as the source of record until the cutover is verified.

| Legacy data | New schema target | Required mapping | Verification |
| --- | --- | --- | --- |
| community posts | `posts` | title/body, author/user id, category, created/updated dates, visibility/status | row count, latest 20 posts, one post with comments |
| comments | `comments` | post id, parent comment id if present, body, author/user id, created/updated dates, deleted/hidden state | comment count by post, nested comment sample |
| marketplace items | `marketplace_items` | title/body, price, status, seller id, images, created/updated dates | item count by status, image URL reachability |
| marketplace comments | `marketplace_comments` | item id, author/user id, body, created/updated dates | count by item and latest sample |

Execution rule:

1. Export read-only snapshots from legacy PostgreSQL.
2. Import into a staging database that uses the new schema.
3. Run row-count and sample-content checks before any domain switch.
4. Keep legacy PostgreSQL unchanged until the new service has passed post-switch smoke checks.

## 2. Shared Link Compatibility / P2-SHARE-001

P2-SHARE-001 means existing shared links must not become dead ends during launch. Build a redirect map before switching domains.

Required redirect map:

| Old URL family | New destination | Notes |
| --- | --- | --- |
| `/records?...` | `/records?...` | preserve query string exactly |
| `/profile-card...` | `/profile-card...` | preserve card-making loop |
| `/competitions...` | `/competitions...` | preserve year and competition query params |
| `/community/posts/:id` or legacy post detail | new community post detail if migrated, otherwise `/community` with a soft 안내 | do not expose raw 404 |
| `/marketplace...` | `/marketplace...` if feature remains visible, otherwise lower-priority more-menu path | keep route reachable |
| unknown old route | 404 page with record-search recovery | already aligned with PR #5 launch surface |

Verification:

1. Collect the top shared URL patterns from Netlify/Render logs if available.
2. Add redirect rules in the production hosting layer or Express fallback.
3. Test at least 20 representative old links before and after domain switch.

## 3. WebSocket Chat Integration

Legacy ws chat uses `ws`. The new production shape is a unified Express server that serves frontend and API from the same origin.

Transition plan:

1. Preserve the legacy room names: `main`, `training`, `race`, `injury`.
2. Move the legacy ws chat handler into the new Express server startup path.
3. Configure `frontend/src/pages/ChatPage/hooks/useWebSocket.ts` through `VITE_WS_URL`.
4. During staging, set `VITE_WS_URL` to the staging WebSocket endpoint.
5. At production cutover, set `VITE_WS_URL` to the new production endpoint, or remove the override only after same-origin WebSocket is confirmed.

Verification:

1. Browser opens `/chat`.
2. WebSocket handshake returns 101.
3. Two clients in the same room receive the same message.
4. A client in another room does not receive the message.

## 4. Deployment Transition And Rollback

Cutover order is deliberately slow. Do not switch everything at once.

Korean operator shorthand: 검증 → 도메인 전환 → 레거시 백엔드 종료. Any rollback keeps this order reversible.

1. Pre-switch verification
   - Deploy the new service to a staging Render service.
   - Attach a staging database loaded from the legacy PostgreSQL snapshot.
   - Verify auth, records search, community read/write, marketplace read/write, chat, data-request, and operator guide.
   - Confirm zero-result analytics uses `ZERO_RESULT_SEARCH_SECRET`.
2. Domain switch
   - Point production frontend/domain traffic to the new service only after staging checks pass.
   - Keep the legacy backend and database running.
   - Watch errors, login failures, WebSocket failures, and 404 recovery for the first launch window.
3. Legacy backend shutdown
   - Shut down legacy services only after the new service has passed production smoke checks and the owner approves.
   - Keep a database backup and export manifest.

Rollback:

1. Restore domain routing to the legacy Netlify/Render service.
2. Stop write traffic to the new database if data divergence is suspected.
3. Export any new community writes made during the failed window.
4. Reconcile those writes into legacy PostgreSQL or rerun the migration plan after fixing the blocker.

## 5. Production Secrets Migration

Secrets must be moved through Render/Netlify environment settings, never committed.

Required secret inventory:

| Secret | Purpose | Migration note |
| --- | --- | --- |
| `JWT_SECRET` | auth session/token signing | generate or copy through secret manager only |
| `ZERO_RESULT_SEARCH_SECRET` | zero-result HMAC fingerprints | must exist in production; no default salt |
| `DATABASE_URL` | PostgreSQL connection | staging and production values must differ |
| `CLOUDINARY_CLOUD_NAME` | marketplace/profile images | copy with Cloudinary account verification |
| `CLOUDINARY_API_KEY` | Cloudinary API | secret manager only |
| `CLOUDINARY_API_SECRET` | Cloudinary signing | secret manager only |
| `EMAIL_USER` / `EMAIL_PASS` | password reset and verification email | verify outbound email before cutover |
| `VITE_API_BASE_URL` | frontend API base | should be empty for same-origin unified server |
| `VITE_WS_URL` | chat WebSocket endpoint | staging first, production after 101 handshake test |
| `PACERISE_API_KEY` or equivalent PaceRise secret | PaceRise result integration | keep server-side if used |

Verification:

1. Render/Netlify env lists are compared against this inventory.
2. No secret values appear in git diff, build logs, or browser bundle.
3. Production startup fails closed if required secrets are missing.

## 6. Go / No-Go Checklist

Go only when all are true:

- Legacy PostgreSQL snapshot count matches staging import counts.
- Shared redirect map covers the known old URL families.
- `/records`, `/competitions`, `/profile-card`, `/community`, `/chat`, `/marketplace`, `/data-request`, and `/admin/operator-guide` pass smoke checks.
- WebSocket chat works with `VITE_WS_URL`.
- Rollback route is documented and still available.
- Owner approves the final switch.

No-Go if any are true:

- Unknown data loss in posts, comments, or market data.
- Shared links fall into raw 404 without record-search recovery.
- Chat handshake fails.
- Secrets are missing or visible in repository/build output.
- New production writes cannot be separated for rollback.

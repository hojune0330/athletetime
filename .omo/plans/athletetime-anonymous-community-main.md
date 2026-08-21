# athletetime-anonymous-community-main - Work Plan

## TL;DR (For humans)

**What you'll get:** AthleteTime의 첫 화면을 육상인 전용 익명 커뮤니티로 바꾸고, 확인된 회원만 글과 댓글을 읽고 쓰게 합니다. 댓글 이름은 글마다 `글쓴이`, `느긋한 카피바라`, `바삭한 맛탕`처럼 새로 배정되고, 새 글에는 `책없쾌 카피바라`, `눈 가리고 야옹`, `가보자고 쿼카` 같은 수동 검수 밈 별칭도 드물게 섞입니다. 게시물 카드에는 공감을 받은 우수댓글 최대 2개가 바로 보여 상세 댓글로 연결되며, 비회원에게는 사람이 검수한 육상 정보와 익명성 설명만 보입니다.

**Why this approach:** 이용자가 적은 시장에서는 여러 게시판보다 한 피드가 대화를 모으기 좋습니다. 브라우저가 보낸 익명 ID를 믿지 않고 서버 세션에서 별도 비밀키로 익명 행위자를 만들며, 일반 운영 화면에는 계정·선수 기록·IP·내부 행위자 키를 보내지 않아 제품 약속을 기술적으로 지킵니다.

**What it will NOT do:** “관리자도 모르는 절대 익명”을 약속하지 않습니다. 이미지·설문·비추천·게시물 인기 승격·전역 평판·공개 프로필·DM·실시간 채팅·AI 자동 게시도 만들지 않습니다. 미성년자 정책, 보존기간, 운영시간, 담당자가 실제 값으로 승인되기 전에는 공개 출시 스위치가 열리지 않습니다.

**Effort:** XL
**Risk:** High - 인증·익명성·신고·보존·미성년자 운영을 동시에 다루고 `/`의 주 기능을 바꾸는 작업입니다.
**Decisions to sanity-check:** 단일 피드와 네 개 태그, `공개 운영 정보 + 승인 회원 전용 익명 대화`, 새 배정의 80% 기본 별칭·20% 수동 검수 밈 별칭, 게시물별 우수댓글 최대 2개, 공개 출시 전 정책값 승인 게이트입니다.

Your next move: 이 계획으로 구현을 시작하거나, 먼저 고정밀 이중 검토를 실행합니다.

---

> TL;DR (machine): XL/high-risk staged implementation: isolated anonymous storage/API, invite-only member conversation, versioned thread-scoped cute/meme aliases, positive-only per-post featured comments, human-reviewed editorials, community-first UI, fail-closed release and full browser/security gates.

## Scope
### Must have
- `/`를 익명 커뮤니티 홈으로 바꾸고 `/community`는 같은 홈으로 정규화한다. 기존 기록·대회 상세 경로는 유지하고 홈에서 바로 접근 가능하게 한다.
- 공개 방문자는 `운영 정보`, 익명성 설명, 로그인/참여 안내만 본다. 익명 글·댓글·검색 결과 본문은 `email_verified = TRUE`이면서 `community_memberships.status = 'active'`인 세션에만 제공한다. 이메일 인증만으로 자동 가입시키지 않는다.
- 새 기능은 `/api/community/*`와 `community_*` 테이블만 사용한다. 레거시 `/api/posts`, `/api/comments`, `posts`, `comments`, `reports`, 브라우저 `anonymousId`를 연결하거나 재개하지 않는다.
- `COMMUNITY_ACTOR_SECRET`으로 서버 세션의 `user.id`에서 콘텐츠용 HMAC 행위자 키를 파생한다. 비밀키는 JWT·다른 pepper와 분리하고 최소 32바이트이며, 없거나 바뀐 상태에서는 커뮤니티를 fail-closed 한다.
- 게시글 작성자의 모든 댓글은 `글쓴이`로 표시한다. 다른 댓글 작성자는 같은 글에서 안정적이고 다른 글에서는 달라지는 서버 배정 별칭을 쓴다. 전체 문구를 사람이 검수한 고정 allowlist로 두고, 새 별칭 배정은 HMAC bucket 기준 기본 동물·음식 팩 80%와 버전형 `2026-08` 안전 밈 팩 20%로 고정한다. 기본 예시는 `느긋한 카피바라`, `졸린 고양이`, `포근한 수달`, `동글한 쿼카`, `따뜻한 햇밥`, `바삭한 맛탕`, `말랑한 붕어빵`, `고소한 주먹밥`, 밈 예시는 `책없쾌 카피바라`, `또 뛰고 싶은 수달`, `노력이 숲으로 간 고양이`, `눈 가리고 야옹`, `가보자고 쿼카`다. 기존 글에 저장된 별칭은 팩 갱신으로 바꾸지 않는다. 상표 `햇반`, 정치·성적·혐오·비하·연예인/팬덤·가사/인용·공격적 유행어·신원 암시 단어는 금지하고, 충돌 시 짧은 숫자 접미사를 붙인다.
- 단일 피드에 `대회·기록`, `훈련·장비`, `학교·팀 생활`, `자유` 태그와 `최신`, `지금 대화 중` 정렬만 제공한다. 후자는 최근 댓글 시각만 사용한다.
- 텍스트 게시글·댓글·검색·신고·브라우저 로컬 숨김·`내가 참여한 글`·로컬 마지막 열람시각 기반 새 답글 표시를 제공한다.
- 댓글에는 active member가 누를 수 있는 양수형 `공감`만 제공한다. 자기 댓글 공감은 거부하고 회원 한 명당 댓글 하나를 idempotent하게 토글한다. 작성자를 제외한 서로 다른 회원의 공감이 2개 이상인 댓글 중 공감 수 내림차순, 임계치 도달 시각·댓글 작성 시각·댓글 ID 오름차순으로 게시물당 최대 2개를 `우수댓글`로 고른다. 피드 카드에서 별칭·최대 2줄 본문·`공감 n`을 바로 보여 `/community/posts/:id#comment-:commentId`로 연결한다. 자격 댓글이 없으면 우수댓글로 속이지 않고 최신 댓글 최대 1개를 `최근 댓글`로 표시한다. 보류·삭제·신고자 로컬 숨김 대상은 즉시 대표 댓글에서 제외한다.
- 작성 전 신원 추정 위험 경고와 익명 신뢰 패널을 제공한다. 문구는 공개/일반 운영 화면에서 계정·선수 기록을 연결하지 않는다는 검증 가능한 범위로 제한한다.
- `membership_operator`, `community_moderator`, `release_owner`를 분리한다. 일반 `is_admin`/`requireAdmin`만으로 세 권한을 대신하지 않는다.
- 신고 중복 방지, 신고자 화면 즉시 숨김, 사람 검토용 보류·복구·회원 제재·감사 이력·정책 기반 파기 도구를 제공한다. 일반 모더레이션 응답에는 원계정, 이메일, IP, 세션, HMAC 행위자 키가 없어야 한다.
- Content Studio에서 사람이 출처·권리·최종 문구를 확인한 `운영 정보`만 발행·정정할 수 있다. AI는 초안 보조만 가능하고 자동 게시·익명 사용자 사칭은 금지한다.
- 모든 회원 API 응답은 `Cache-Control: no-store`; `/community/**`는 `noindex,noarchive`; 공개 API는 운영 정보 외 사용자 대화 본문을 반환하지 않는다.
- 미성년자/보호자 정책, 삭제·신고·모더레이션·감사 보존기간, 운영시간과 담당 역할이 설정되지 않으면 구현·테스트는 가능하되 `pilot` 공개 상태로 전환할 수 없다.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- “관리자도 모르는 절대 익명”, “누구도 추적 불가”, 법적 안전 보장 문구.
- 브라우저가 제출한 작성자 ID, `anonymousId`, reporter key, nickname을 권한·소유권 판단에 사용.
- 계정과 콘텐츠 행위자 키를 연결하는 조회 테이블, 공개 작성자 프로필, 작성자별 글 목록, 전역 닉네임, 팔로우, 평판 점수.
- 레거시 `/api/posts`/`posts`/`comments`/채팅 `reports`를 새 커뮤니티 저장소로 재사용하거나 데이터 마이그레이션.
- 이미지·파일 업로드, 설문, 비추천, 게시물 인기 승격, 전역 베스트/사용자 랭킹·karma, 다중 게시판, DM, 푸시 알림, 실시간 채팅, 댓글 봇. 게시물 내부 대표 댓글 최대 2개 외에는 공감 수를 피드 정렬·검색 순위·작성자 평판에 사용하지 않는다.
- 신규 외부 분석 SDK·행동 추적·광고 SDK·새 UI 라이브러리. Node 표준 `crypto`, 기존 Express/PostgreSQL/Zod/Tailwind 패턴을 우선한다.
- Content Studio 초안을 자동 발행하거나 AI 생성물을 사용자 글처럼 표시.
- 정책값이 비어 있는데 임의 기본 보존기간·연령 기준·운영시간을 넣어 공개 출시.
- 이 계획에서 production DB migration 실행, production 기능 활성화, 배포 또는 트래픽 전환. 구현은 기본 `closed` 상태와 로컬/CI/staging 증거까지만 완료한다.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: 보안·익명성·권한·비동기 경계는 Node `node:test`/PGlite/PostgreSQL 및 Vitest로 TDD한다. UI는 RTL 동작 테스트 후 실제 Chrome 320/375/768/1280 브라우저 QA를 수행한다. 단순 문서 문구 외에 grep/source-regex만으로 합격시키지 않는다.
- Runtime: 모든 명령 시작 전 `node -p "process.version"`가 정확히 `v22.17.1`인지 기록한다. 다른 런타임 결과는 최종 증거로 인정하지 않는다.
- Core backend gate: `node --test backend/tests/anonymous-community-actor.test.js backend/tests/anonymous-community-storage.test.js backend/tests/anonymous-community-release.test.js backend/tests/anonymous-community-api.test.js backend/tests/community-moderation-retention.test.js`.
- Frontend gate: `npm --prefix frontend test -- --run src/features/community src/pages/CommunityPage.test.tsx src/pages/admin/AdminContentStudioPage.test.tsx` followed by `npm --prefix frontend run build:check` and `npm --prefix frontend run lint`.
- Browser gate: `COMMUNITY_BROWSER_TESTS=1 RECORDS_E2E_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node --test backend/tests/anonymous-community-e2e.test.js`.
- Standard regression gate: wire the new non-browser tests into root `npm run test:non-browser`/`npm run verify` and the browser test into the existing required workflow as a separate bounded job; do not hide it behind an unadvertised opt-in in CI.
- Evidence: outside an active ulw-loop use `.omo/evidence/athletetime-anonymous-community-main/task-<N>/`; each todo records raw command, exact SHA/source fingerprint, exit code, sanitized JSON, and UI tasks record fresh PNGs. Evidence must not contain account IDs, emails, IPs, actor keys, post bodies from real users, secrets, or source URLs.

## Execution strategy
### Parallel execution waves
> The dependency matrix is authoritative. A todo starts as soon as its listed dependencies are complete; tasks in the same wave may still serialize where the matrix requires it.
- Wave 1 - policy and foundations: Todos 1-3. Todo 1 fixes the public contract while the actor/alias kernel and isolated schema proceed against the exact decisions below.
- Wave 2 - server boundaries: Todos 4-7. Release/access controls land first; member and operator APIs then share the isolated repository; frontend schemas begin only from the frozen DTO allowlists.
- Wave 3 - user and operator surfaces: Todos 8-11. Home and conversation surfaces own separate files; Content Studio and navigation integrate after strict clients exist.
- Wave 4 - integrated release proof: Todo 12 only after all product todos are green.
- Final wave - independent audits: F1-F4 run after Todo 12 and all must approve the exact same source fingerprint.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | none | 4, 5, 6, 10, 11, 12 | 2, 3 |
| 2 | none | 3, 4, 5, 6, 12 | 1 |
| 3 | 2 actor-key/alias contract | 5, 6, 12 | 1 |
| 4 | 1, 2 | 5, 6, 12 | 3 after actor contract freezes |
| 5 | 2, 3, 4 | 7, 8, 9, 12 | 6 after repository contract freezes |
| 6 | 2, 3, 4 | 7, 10, 12 | 5 after repository contract freezes |
| 7 | 5, 6 | 8, 9, 10, 11, 12 | none |
| 8 | 7 | 11, 12 | 9, 10 with disjoint files |
| 9 | 7 | 11, 12 | 8, 10 with disjoint files |
| 10 | 1, 6, 7 | 11, 12 | 8, 9 with disjoint files |
| 11 | 1, 7, 8, 9, 10 | 12 | none |
| 12 | 1-11 | F1-F4 | none |

## Todos
> Implementation + Test = ONE todo. Never separate.

- [ ] 1. 익명 커뮤니티 owner decision과 공개 출시 차단 조건을 문서로 고정
  What to do / Must NOT do: 새 `docs/decisions/07-anonymous-community-main.md`에 승인된 제품 방향, 정확한 익명성 문구, 공개/회원 경계, 네 태그, 글별 별칭, `2026-08` 수동 검수 밈 팩과 금지 범주, 양수형 공감·게시물별 우수댓글 최대 2개, 사람 검수 정보, 역할 분리, Scope OUT을 기록한다. `docs/athletetime-service-purpose-and-retention.md`의 records-first 전제를 커뮤니티-first/기록 보조 구조로 의도적으로 갱신하고 `docs/decisions/06-magazine-editorial-publication.md`는 수동 검수·수동 발행 pilot만 승인하되 자동 생성/스케줄러는 계속 닫는다. 미성년자·보존기간·운영시간·담당자 값은 이름 있는 출시 체크리스트 항목으로 남기고 값이 없으면 public release 금지라고 명시한다. 기존 채팅 결정은 이번 계획으로 승인하거나 수정하지 않는다. 상표 `햇반`을 제품 allowlist에 넣지 말고 `햇밥`/`따뜻한 밥`을 사용한다. 밈 팩은 원격 자동 수집·런타임 AI 생성·관리자 스케줄러 없이 정상 코드리뷰로만 갱신한다.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 4, 5, 6, 10, 11, 12
  References (executor has NO interview context - be exhaustive): `docs/decisions/05-verified-member-community-chat.md:1-198`; `docs/decisions/06-magazine-editorial-publication.md`; `docs/athletetime-service-purpose-and-retention.md:9-20,44-49,114`; `docs/athletetime-auth-privacy-security-contract.md:1-75`; `docs/work-orders/20260708-community-activation-track-h.md:1-5`; `.omo/drafts/athletetime-anonymous-community-main.md`.
  Acceptance criteria (agent-executable): a Node assertion script reads the three decision/purpose files and proves the exact public promise, `closed until policy values exist`, `manual review + manual publish`, four tags, `글쓴이`, versioned animal/food/meme aliases, positive-only per-post featured comments, and all three operator roles are present; it also proves `절대 익명`, `누구도 추적`, `AI 자동 게시`, remote meme ingestion, downvote/global karma, and trademark `햇반` are absent from approved copy. `git diff --check` exits 0.
  QA scenarios (name the exact tool + invocation): happy - run the documentation assertion under Node 22.17.1 and save output to `.omo/evidence/athletetime-anonymous-community-main/task-1/policy-contract.txt`; failure - point the same assertion at a temporary fixture missing one policy value and require nonzero exit, evidence `task-1/policy-fail-closed.txt`.
  Commit: Y | `docs(community): approve anonymous pilot boundary`

- [ ] 2. 서버 HMAC 익명 행위자와 글별 귀여운 별칭 커널을 TDD로 구현
  What to do / Must NOT do: 새 `backend/utils/communityActor.js`에 Node `crypto.createHmac`만 사용해 `user.id`에서 콘텐츠 행위자 키와 `postId + actorKey`에서 글별 별칭 시드를 domain-separated 방식으로 파생한다. `COMMUNITY_ACTOR_SECRET`은 JWT/다른 pepper와 별도이며 최소 32바이트로 검증하고 누락/변경 감지 시 release readiness가 실패한다. 작성자 댓글은 항상 `글쓴이`; 다른 참여자는 전체 문구가 검수된 최소 24개 기본 별칭과 최소 8개 `2026-08` 밈 별칭에서 결정론적으로 배정한다. HMAC bucket을 80:20으로 나누고, 각 팩 내부 선택도 HMAC으로 결정해 랜덤 상태나 원격 데이터가 필요 없게 한다. 별칭은 compact CJK 기준 2~4어절·40자 이하이며 새 배정에만 현재 팩을 쓰고 저장된 글별 별칭은 보존한다. 동일 글 안의 충돌은 DB 저장 계층이 재시도할 수 있도록 안정적인 후보 순서와 숫자 접미사를 제공한다. 공개 함수는 원계정·이메일·선수 키를 받거나 반환하지 않으며 브라우저 ID, 무염 SHA-256, 전역 닉네임을 재사용하지 않는다. `privacyGuardLogger`가 `actorKey`, `actor_key`, alias seed, reporter actor, community secrets를 항상 마스킹하게 한다.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 3, 4, 5, 6, 12
  References (executor has NO interview context - be exhaustive): `backend/utils/websocket.js:51-57` (재사용 금지 사례); `frontend/src/utils/anonymousUser.ts:17-37` (재사용 금지); `backend/utils/privacyGuardLogger.js:20,41-58`; `backend/middleware/auth.js:25-84`; Node `crypto` 표준 라이브러리.
  Acceptance criteria (agent-executable): TDD `node --test backend/tests/anonymous-community-actor.test.js` passes cases for missing/short secret fail-closed, same account stable content actor, different accounts differ, same actor same thread stable alias, different thread changes alias, author=`글쓴이`, deterministic collision suffix, fixed `2026-08` pack/version, representative 10,000-bucket probe within 78~82% 기본 팩, persisted aliases unchanged after catalog version fixture changes, 2~4어절/40자 limit, allowlist-only Korean output, forbidden/trademark/celebrity/lyric/aggressive words absent, log redaction. No added dependency/lockfile diff and no secret/actor key appears in serialized public fixtures.
  QA scenarios (name the exact tool + invocation): happy - run focused Node test and a 100-actor/100-thread collision probe, evidence `task-2/actor-alias-green.txt`; failure - run with missing and one-byte-changed secrets and require readiness denial without printing secret material, evidence `task-2/actor-secret-fail-closed.txt`.
  Commit: Y | `feat(community): add anonymous actor aliases`

- [ ] 3. 레거시와 분리된 커뮤니티 스키마·저장소·보존 정리 경로를 구축
  What to do / Must NOT do: `backend/database/migration-009-anonymous-community.sql`과 최소 저장소 모듈을 추가한다. 테이블은 `community_memberships`, `community_operator_roles`, `community_runtime_state`, `community_posts`, `community_comments`, `community_thread_aliases`, `community_comment_reactions`, `community_reports`, `community_moderation_actions`, `community_editorials`로 고정한다. membership/operator 테이블만 계정 FK를 가지며 콘텐츠/댓글/별칭/공감/신고에는 HMAC actor key만 저장하고 account↔actor 매핑 테이블은 만들지 않는다. alias에는 `(post_id, actor_key)`와 `(post_id, alias_label)` unique 제약, reaction에는 `(comment_id, actor_key)` unique 제약과 bounded lookup index, report에는 `(reporter_actor_key,target_type,target_id)` dedupe 제약을 둔다. 자기 댓글 공감은 저장소 transaction에서 거부한다. deleted/held/published 상태와 필요한 타임스탬프를 명시하고 공개 본문은 삭제 즉시 비우며 연결 공감도 대표 댓글 집계에서 제외한다. 정책값이 설정된 경우에만 만료 데이터를 정리하는 `tools/cleanup-community-retention.js`를 만들며 미설정 값을 임의 기본값으로 대체하지 않는다. 기존 `posts/comments/reports`나 실제 데이터를 읽거나 이동하지 않는다.
  Parallelization: Wave 1 | Blocked by: 2 actor-key/alias contract | Blocks: 5, 6, 12
  References (executor has NO interview context - be exhaustive): `backend/database/schema.sql:31-46,75-115,165-230` (연결 금지 레거시); `backend/database/migration-008-chat-reports-repair.sql:21-31` (재사용 금지); `backend/database/run-migrations.js:8-17,30-70`; `backend/database/migration-001-add-auth.sql:17,74-121`; existing PGlite/PostgreSQL patterns in `backend/tests/data-rights-postgres.integration.test.js`.
  Acceptance criteria (agent-executable): `node --test backend/tests/anonymous-community-storage.test.js backend/tests/anonymous-community-postgres.integration.test.js` passes fresh migration, repeat migration idempotency, constraints, alias collision allocation, one-reaction-per-comment uniqueness, self-reaction denial, idempotent add/remove, report dedupe, hold/restore, body purge, actor anonymization, and transaction rollback. A schema introspection assertion proves no community content table has `user_id`, `email`, `ip_address`, `athlete_key`, `anonymous_id`, or FK to legacy posts/comments/reports. `listMigrationFiles()` includes migration 009 and checksum drift still fails.
  QA scenarios (name the exact tool + invocation): happy - migrate a disposable PGlite/PostgreSQL database, create post/comment/report/editorial, purge with test-only policy values, evidence `task-3/storage-roundtrip.json`; failure - inject a constraint failure mid-transaction and prove no partial content/alias/report rows remain, evidence `task-3/storage-rollback.txt`.
  Commit: Y | `feat(community): isolate anonymous storage`

- [ ] 4. 기능 중지·회원 접근·역할·요청 크기·rate limit 경계를 fail-closed로 구현
  What to do / Must NOT do: 새 `backend/middleware/communityAccess.js`와 필요한 최소 설정/limiter 모듈로 `closed|pilot|paused` 상태를 강제한다. 회원 대화는 기존 `authenticateToken`, `requireEmailVerified` 후 active membership을 요구하고, 이메일 인증만으로 membership을 생성하지 않는다. 운영 API는 `membership_operator`, `community_moderator`, `release_owner`를 각각 검사하며 `requireAdmin` 단독 통과를 금지한다. `src/server.js`에서 전역 15MB 파서보다 먼저 `/api/community`에 엄격한 작은 JSON parser를 적용해 초과 요청을 413으로 막되 기존 CSRF 미들웨어 순서를 유지한다. 계정 HMAC과 짧은 수명의 network HMAC bucket을 조합한 in-memory rate limit을 쓰고 raw IP를 key/log/DB에 저장하지 않는다. conversation 응답은 항상 `no-store`; pause는 데이터를 삭제하지 않고 대화 API만 503으로 닫는다. health에는 `closed|pilot|paused`만 노출한다.
  Parallelization: Wave 2 | Blocked by: 1, 2 | Blocks: 5, 6, 12
  References (executor has NO interview context - be exhaustive): `src/server.js:140-157,265-278`; `backend/middleware/launchFeatureGate.js:1-54`; `backend/middleware/auth.js:25-115`; `backend/utils/authCookies.js`; `frontend/src/api/client.ts:13`; `card-studio/middleware/rateLimiter.js:24-37,49-117` (raw-IP 패턴 재사용 금지); `backend/auth/routes.js:780-866` and `backend/database/migration-001-add-auth.sql:17` for `email_verified`.
  Acceptance criteria (agent-executable): `node --test backend/tests/anonymous-community-release.test.js` passes guest/unverified/unapproved/revoked denial, active member success, three-role cross-denial matrix, forged client actor ignored, cookie auth without CSRF denied, oversized JSON 413 before handler, account/network 429 with `Retry-After`, raw IP absent from limiter state/logs, missing secrets/policy values closed, pause 503+no-store, resume preserves rows. Existing `/api/posts` remains 503.
  QA scenarios (name the exact tool + invocation): happy - loopback server in `pilot` with test policy values exercises member GET/POST and role-specific admin calls, evidence `task-4/access-release-green.json`; failure - remove each secret/policy/role/membership in turn and require fail-closed responses without body or identifier leakage, evidence `task-4/access-release-denials.json`.
  Commit: Y | `feat(community): enforce anonymous release gates`

- [ ] 5. 좁은 `/api/community` 회원 대화·공개 정보·내 데이터 API를 구현
  What to do / Must NOT do: 새 router/service에서 공개 `GET /api/community/public/editorials`와 회원 전용 `GET /feed`, `GET /posts/:id`, `POST /posts`, `POST /posts/:id/comments`, `PUT /comments/:id/reaction`, `DELETE /comments/:id/reaction`, `POST /reports`, `GET /me/participated`, `GET /me/export`, `DELETE /me/content`만 제공한다. feed query는 네 태그, `latest|active`, bounded text search, cursor만 허용하고 SQL 파라미터를 사용한다. `active`는 `last_commented_at`; 공감은 게시물 정렬·검색 순위에 사용하지 않는다. feed는 N+1 없이 한 bounded query에서 게시물별 대표 댓글 최대 2개를 포함한다. eligible은 작성자를 제외하고 active membership 요청 경계를 통과한 서로 다른 actor의 공감 2개 이상이며, 순서는 공감 수 DESC, 두 번째 유효 공감 시각 ASC, 댓글 작성 시각 ASC, 댓글 ID ASC다. eligible이 없으면 최신 공개 댓글 1개를 `recent`로 반환한다. held/deleted 대상은 즉시 제외하고 reaction ack/feed/detail DTO는 허용 필드만 직렬화한다. 서버가 세션 actor를 계산하고 client author/reporter/alias 필드는 strict validation에서 거부한다. public/member DTO는 account/email/IP/session/actor key/athlete record를 반환하지 않는다. self-hide와 last-view는 API에 저장하지 않고 프론트 로컬 상태로 둔다. export/delete는 현재 세션에서 actor를 다시 계산해 자기 콘텐츠만 조회·본문 제거/행위자 익명화하며 매핑 테이블을 만들지 않는다. 기존 `/api/posts`는 계속 닫는다.
  Parallelization: Wave 2 | Blocked by: 2, 3, 4 | Blocks: 7, 8, 9, 12
  References (executor has NO interview context - be exhaustive): `backend/routes/posts.js:327-379` and `backend/routes/comments.js:18-63` (신뢰 금지 레거시); `src/server.js:265-275`; `backend/utils/contentFilter.js:1-75` (동작 테스트 후 profanity 보조로만 재사용); `frontend/src/components/community/RecordContextPrompt.tsx:8-35`; current data-rights integration at `card-studio/services/dataRequestService.js`; OWASP logging/privacy links recorded in draft findings.
  Acceptance criteria (agent-executable): `node --test backend/tests/anonymous-community-api.test.js` passes guest editorial-only, guest/member body isolation, strict query/body rejection, forged actor ignored, canonical four tags/two sorts, cursor pagination, valid-empty search, same-thread aliases, cross-thread alias change, author `글쓴이`, reaction add/remove/duplicate/self denial, 2-reaction threshold, deterministic tie-break, recent fallback, moderation exclusion, feed order unchanged by reactions, bounded query count/payload, report dedupe, participated ordering, export ownership, confirmed delete/anonymize, no-store, DTO forbidden-key recursive scan, SQL-injection input treated as text. Real route tests—not a fake—must cover 401/403/413/429/503.
  QA scenarios (name the exact tool + invocation): happy - loopback member creates post, two accounts comment, report, export and delete using cookies+CSRF; sanitized evidence `task-5/member-api-roundtrip.json`; failure - guest, revoked member, forged actor, malformed cursor, oversized body, and another member's delete all fail without revealing whether hidden content exists, evidence `task-5/member-api-hostile.json`.
  Commit: Y | `feat(community): add anonymous conversation API`

- [ ] 6. 회원 승인·모더레이션·운영 정보 발행 API와 역할 분리를 구현
  What to do / Must NOT do: `/api/community/admin` 아래 membership grant/revoke, report queue, target hold/restore, membership sanction, moderation audit, editorial draft/review/publish/correct, runtime pause/resume/readiness만 제공한다. membership operator는 회원 상태만, community moderator는 콘텐츠/신고/제재만, release owner는 readiness/pause/resume만 처리한다. 한 계정이 복수 role을 가질 수는 있으나 endpoint마다 요구 role을 명시한다. moderator DTO에는 신고 대상 공개 텍스트·사유·상태·시간·조치만 포함하고 author/reporter account, email, IP, session, actor key를 절대 포함하지 않는다. 위험 콘텐츠는 명확한 개인정보 직접 노출 규칙에서만 자동 hold하고, 신고 수 고정 임계치만으로 전체 자동 블라인드하지 않는다. hold/delete는 같은 transaction 뒤 대표 댓글 조회에서 즉시 제외되고 restore는 다시 자격을 계산한다. editorial은 출처·권리·reviewed_by가 없으면 publish 불가하며 사용자 피드 항목처럼 위장하지 않는다.
  Parallelization: Wave 2 | Blocked by: 2, 3, 4 | Blocks: 7, 10, 12
  References (executor has NO interview context - be exhaustive): `backend/middleware/auth.js:108-115` (generic admin 재사용 금지); `backend/database/migration-008-chat-reports-repair.sql:21-31` (chat report 재사용 금지); `frontend/src/pages/admin/AdminContentStudioPage.tsx:26-239`; `frontend/src/features/content-studio/ContentStudioEditor.tsx:46-159`; `frontend/src/pages/admin/AdminContentPage.tsx:1-151` (기반으로 사용 금지).
  Acceptance criteria (agent-executable): `node --test backend/tests/community-moderation-retention.test.js` passes all role allow/deny combinations, active membership not auto-created by email verification, duplicate report idempotency, report queue forbidden-key scan, hold/delete immediately removes representative comments and restore deterministically re-evaluates them, sanction blocks new writes but preserves appeal/audit evidence, pause preserves rows, retention cleanup honors supplied values, missing policy refuses release, editorial publish requires human review/source/rights and correction preserves history.
  QA scenarios (name the exact tool + invocation): happy - three operator fixtures each complete only their assigned journey and a fourth multi-role fixture proves composition, evidence `task-6/operator-role-matrix.json`; failure - generic admin and wrong-role attempts all return 403, malformed editorial cannot publish, report queue never includes identity keys, evidence `task-6/operator-denials.json`.
  Commit: Y | `feat(community-admin): add safe pilot operations`

- [ ] 7. 프론트엔드 커뮤니티 DTO를 Zod strict boundary로 고정
  What to do / Must NOT do: `frontend/src/features/community/api.ts`, `schemas.ts`, `types.ts`(또는 더 적은 기존 패턴 파일)에 public editorial, access status, feed item, featured/recent comment preview, detail, comment, reaction acknowledgement, participated, report acknowledgement, operator DTO를 strict Zod schema로 정의한다. 기존 `frontend/src/api/client.ts`의 cookie/CSRF 전송을 재사용한다. unknown key를 strip하지 말고 reject해 identity drift를 감지한다. UI는 `aliasLabel`만 받으며 account/email/IP/session/actor/athlete fields를 타입에도 두지 않는다. 대표 댓글은 `kind: 'featured'|'recent'`, comment ID, alias, bounded snippet, reaction count, href만 허용한다. sort/tag enum은 서버 계약과 정확히 일치하고 401/403/503을 login/invite/paused 상태로 구분한다. 새 API client를 레거시 `frontend/src/api/posts.ts` 또는 `anonymousUser.ts`에 연결하지 않는다.
  Parallelization: Wave 2 | Blocked by: 5, 6 | Blocks: 8, 9, 10, 11, 12
  References (executor has NO interview context - be exhaustive): `frontend/src/api/client.ts:1-30`; `frontend/src/api/recordAnalyticsSchemas.ts` (strict Zod pattern); `frontend/src/api/posts.ts:91-104` and `frontend/src/utils/anonymousUser.ts:17-37` (재사용 금지); `frontend/src/features/community` existing files if present.
  Acceptance criteria (agent-executable): `npm --prefix frontend test -- --run src/features/community/api.boundary.test.ts` passes valid public/member/admin/reaction/representative-comment payloads and rejects extra/malformed account, email, IP, actor, athlete, raw author, unknown preview kind, forged reaction count/href, unknown tag/sort, malformed cursor and oversized text. TypeScript has no `any`, double assertion, `@ts-ignore`, `@ts-expect-error`; `npm --prefix frontend run build:check` exits 0.
  QA scenarios (name the exact tool + invocation): happy - MSW/loopback valid fixtures parse and the client sends cookies+CSRF only to same-origin `/api/community`, evidence `task-7/frontend-boundary-green.txt`; failure - hostile 200 responses with valid-looking but forbidden identity fields reject before rendering or local persistence, evidence `task-7/frontend-boundary-hostile.txt`.
  Commit: Y | `feat(community): parse strict anonymous boundaries`

- [ ] 8. `/`를 공개 정보와 회원 익명 피드가 공존하는 커뮤니티 홈으로 전환
  What to do / Must NOT do: 기존 `CommunityPage.tsx`를 실제 홈 컨테이너로 전환하고 `App.tsx`의 `/`가 이를 렌더하게 한다. `/community`는 history replace로 `/`에 정규화한다. guest는 헤드라인 `육상에서만 통하는 이야기, 기록과 소속은 숨기고 솔직하게.`, 검증 가능한 보조문구, 익명 신뢰 패널, `운영 정보`, 로그인/참여 안내를 본다. active member는 같은 상단 아래 한 피드, 네 태그, `최신|지금 대화 중`, 검색, `내가 참여한 글`을 본다. 게시물은 DC식 브랜드/색을 복사하지 않고 촘촘한 정보 문법만 빌린 `CommunityThreadRow`로 표현한다: 태그·제목·요약·댓글 수·최근 활동 다음에 `우수댓글` 최대 2개 또는 `최근 댓글` 1개를 별칭·2줄 snippet·`공감 n`과 함께 직접 붙인다. 각 `CommentPreview` 전체가 상세 anchor 링크이며 전역 작성자 식별자·avatar·rank는 없다. 기존 기록/대회 바로가기는 상단 보조 모듈로 유지한다. 구현 전 `DESIGN.md`에 `CommunityThreadRow`, `CommentPreview`, `AliasLabel`, `ReactionButton`, `HighlightedComment`의 토큰·간격·상태를 추가하고, warm off-white/deep teal/hairline/square-first 원칙과 기존 Card/Button/Input/Tailwind 토큰을 재사용하며 임의 색/새 UI 라이브러리/래스터 대체를 만들지 않는다.
  Parallelization: Wave 3 | Blocked by: 7 | Blocks: 11, 12 | Can parallelize with: 9, 10 on disjoint feature files
  References (executor has NO interview context - be exhaustive): `frontend/src/App.tsx:82-85,148-160`; `frontend/src/pages/CommunityPage.tsx:3-9`; `frontend/src/pages/MainPage.tsx`; `frontend/src/components/community/CommunityBoardTabs.tsx:17-25` and `CommunityBestStrip.tsx:21-28,148-203` (분산/인기 UI 재사용 금지); `DESIGN.md:1-24`; existing `Card`, `Button`, `Input` components.
  Acceptance criteria (agent-executable): RTL tests prove guest never receives/renders conversation text; invited-but-inactive sees approval state; member can change exactly four tags/two sorts/search, empty/error/paused states are distinct, shortcuts retain current record/competition destinations, feed card renders no more than two featured previews or exactly one recent fallback, preview link preserves the canonical comment anchor, held/deleted preview disappears, and no post-rank/profile affordance exists. `우수댓글`/`최근 댓글`은 screen reader 이름에 포함되고 모든 controls have accessible names and at least 44px touch targets.
  QA scenarios (name the exact tool + invocation): happy - Chrome at 320/375/768/1280 opens guest then active-member home and exercises tag/sort/search/participated states, evidence `task-8/<width>-community-home.png` plus `task-8/home-results.json`; failure - 401/403/503/empty/network failure each render the correct non-leaking recovery UI with zero console/page errors, evidence `task-8/home-failure-states.json`.
  Commit: Y | `feat(community): make anonymous feed the home`

- [ ] 9. 게시글 작성·상세·댓글·신고·로컬 숨김·재방문 흐름을 구현
  What to do / Must NOT do: `/community/write`와 `/community/posts/:id`에 text-only 작성/상세를 만들고 제목·본문·댓글 길이를 서버 계약과 동일하게 제한한다. 작성기 상단에 `실명·소속·학년·정확한 기록·대회 세부를 함께 쓰면 본인이 드러날 수 있어요` 경고와 계정/선수 기록이 게시물에 붙지 않는다는 정확한 설명을 둔다. 상세에서 작성자 댓글은 `글쓴이`, 다른 댓글은 귀여운 글별 별칭으로 표시하고 다른 글로 이동하면 바뀜을 설명한다. 댓글마다 44px `공감` toggle과 수를 표시하되 자기 댓글에서는 disabled 설명을 제공하고 비추천·사용자 점수는 만들지 않는다. feed의 대표 댓글 anchor로 진입하면 해당 `HighlightedComment`까지 스크롤하고 keyboard focus를 옮기되 `prefers-reduced-motion`에서는 즉시 이동한다. 신고 성공 시 해당 브라우저에서 즉시 숨기고 대표 댓글에서도 제거하며, 별도 `내 화면에서 숨기기`는 post/comment ID만 localStorage에 저장한다. `내가 참여한 글`의 `lastActivityAt`과 브라우저 로컬 last-view timestamp만 비교해 새 답글 cue를 만들며 서버 알림/프로필 이력은 만들지 않는다. 기존 `RecordContextPrompt`는 공개 기록을 작성자에 자동 연결하지 않는 범위에서 주제 링크로만 재사용한다.
  Parallelization: Wave 3 | Blocked by: 7 | Blocks: 11, 12 | Can parallelize with: 8, 10 on disjoint files
  References (executor has NO interview context - be exhaustive): `frontend/src/components/community/RecordContextPrompt.tsx:8-35`; existing form/Card/Button primitives; `frontend/src/api/posts.ts:91-104` and `frontend/src/utils/anonymousUser.ts:17-37` (재사용 금지); `DESIGN.md:1-24`.
  Acceptance criteria (agent-executable): Vitest/RTL tests cover required warning, length limits, successful post/comment, `글쓴이`, stable same-thread alias, changed cross-thread alias, reaction toggle/idempotency/self-disabled/error rollback, representative-comment anchor scroll/focus/reduced-motion, report/self-hide removing the preview, reload persistence of hidden IDs and last-view only, new-reply cue, delete/tombstone, 401/403/413/429/503 handling. localStorage scan proves no account/email/actor/alias seed/body/reaction state is persisted. No upload/poll/downvote/chat control renders.
  QA scenarios (name the exact tool + invocation): happy - two member sessions create a post and comments, revisit participated list and observe one new-reply cue, evidence `task-9/conversation-journey.json` plus 320/375/768/1280 PNGs; failure - compose obvious contact/identity-risk patterns to show warning, then exercise oversized/429/revoked/report/delete paths without losing unrelated draft text, evidence `task-9/conversation-failures.json`.
  Commit: Y | `feat(community): add safe anonymous conversations`

- [ ] 10. Content Studio에 사람 검수형 `운영 정보` 발행·정정 UI를 연결
  What to do / Must NOT do: `AdminContentStudioPage`/`ContentStudioEditor`의 기존 draft/export 흐름을 재사용해 source URL/출처명, 권리 확인, 검수자 확인, 공개 요약, 본문을 검토한 뒤 `운영 정보`로 publish/correct하도록 한다. publish 버튼은 API의 reviewed/source/rights 조건을 그대로 반영하고 preview와 공개 카드가 같은 sanitized model을 사용한다. 사용자 익명 글과 색/라벨/작성 경로를 분리하고 `운영 정보` 라벨·최종 검수 시각·정정 이력을 표시한다. `AdminContentPage`의 자동 queue나 `any` 패턴은 가져오지 않는다. AI draft 버튼이 이미 있다면 결과는 editor draft에만 머물고 자동 API publish를 호출하지 않는다.
  Parallelization: Wave 3 | Blocked by: 1, 6, 7 | Blocks: 11, 12 | Can parallelize with: 8, 9 on disjoint files
  References (executor has NO interview context - be exhaustive): `frontend/src/pages/admin/AdminContentStudioPage.tsx:26-239`; `frontend/src/features/content-studio/ContentStudioEditor.tsx:46-159`; `frontend/src/pages/admin/AdminContentPage.tsx:1-151` (재사용 금지); `docs/decisions/06-magazine-editorial-publication.md`; Task 6 editorial endpoints.
  Acceptance criteria (agent-executable): `npm --prefix frontend test -- --run src/pages/admin/AdminContentStudioPage.test.tsx src/features/content-studio` passes draft preview, missing-source/rights/reviewer denial, manual publish, correction history, public `운영 정보` labeling, and proves no AI action calls publish. Strict client rejects server identity fields. `npm --prefix frontend run build:check` passes.
  QA scenarios (name the exact tool + invocation): happy - membership operator cannot access, authorized editorial operator drafts/reviews/publishes/corrects and guest sees corrected `운영 정보`, evidence `task-10/editorial-roundtrip.json` plus 375/1280 PNGs; failure - attempt publish without each gate and simulate malformed/hostile AI draft, evidence `task-10/editorial-denials.json`.
  Commit: Y | `feat(content-studio): publish reviewed community information`

- [ ] 11. 커뮤니티 우선 내비게이션·SEO·중지 상태를 전체 앱에 통합
  What to do / Must NOT do: desktop Header와 MobileTabBar의 1차 항목을 `커뮤니티`, `기록`, `대회`, `내 활동` 순서의 현재 디자인 범위 안에서 정리하고 root/community canonical route를 맞춘다. `DESIGN.md`에 Todo 8의 다섯 커뮤니티 primitive와 dense-but-readable 간격, `break-keep`/`text-wrap: pretty`, focus/highlight/reaction 상태를 기존 토큰으로 문서화한 뒤 구현이 이를 소비하게 한다. 공개 editorial root는 색인 가능하되 `/community/write`, `/community/posts/**`, 회원 대화 화면은 `noindex,noarchive`와 member API `no-store`를 유지한다. closed/paused 상태에서는 데이터 삭제 없이 공개 운영 정보와 정확한 준비/중지 안내만 보이고 작성/댓글 링크는 비활성화한다. health/status/docs가 chat을 이번 출시로 열었다고 주장하지 않게 하고 레거시 `/api/posts` 503을 유지한다. sticky/fullPage 캡처 아티팩트와 실제 layout defect를 구분할 수 있도록 화면별 stable capture target을 둔다.
  Parallelization: Wave 3 integration | Blocked by: 1, 7, 8, 9, 10 | Blocks: 12
  References (executor has NO interview context - be exhaustive): `frontend/src/components/layout/Header.tsx:84-104`; `frontend/src/components/layout/MobileTabBar.tsx:24-28`; `frontend/src/App.tsx`; `src/server.js:194-203,265-278`; `backend/middleware/launchFeatureGate.js:1-54`; `DESIGN.md:1-24`.
  Acceptance criteria (agent-executable): frontend navigation tests prove canonical root, active states, browser Back/Forward, four accessible mobile targets, preserved records/competition paths, member-detail noindex, public editorial root policy, closed/paused action removal, and no chat route/status change. Backend test proves legacy APIs remain closed and member responses no-store. `npm --prefix frontend run lint` and `build:check` pass.
  QA scenarios (name the exact tool + invocation): happy - Chrome navigates guest/member desktop/mobile root→record→community detail→Back/Forward with exact URLs and focus restoration, evidence `task-11/navigation-history.json`; failure - toggle closed and paused during an open detail session and require safe redirect/read-only notice with no data deletion or stale write control, evidence `task-11/pause-transition.json`.
  Commit: Y | `feat(navigation): promote anonymous community safely`

- [ ] 12. 표준 CI와 실제 Chrome 4폭 매트릭스로 익명 pilot 출시 증거를 완성
  What to do / Must NOT do: 새 테스트를 root package scripts와 existing required workflow에 포함한다. 빠른 계약/보안 테스트, frontend Vitest/typecheck/lint/build, disposable PostgreSQL migration, 별도 Chrome E2E job을 직렬 build/serve isolation으로 구성하고 14일 이내 scoped sanitized artifacts만 업로드한다. E2E fixture는 실제 route/schema를 통과하며 모든 fixture account/member/post/comment keys가 strict schema-valid해야 한다. 320/375/768/1280에서 guest editorial, invite denial, member home/filter/search, 기본·밈 별칭, feed 우수댓글 2개와 최근댓글 fallback, 대표 댓글 anchor/focus, 공감 toggle/self-denial, hold/delete/report 뒤 preview 제거, compose/detail, participated/new reply, moderator identity-free queue, pause/resume/data preservation을 실행한다. 한 feed 응답의 대표 댓글 query/payload/DOM 수가 bounded인지 측정한다. 외부 네트워크는 차단/0건, console/page errors 0, scroll overflow 0, CJK 단어 분리·tofu·잘림 0, 44px control을 assert한다. production DB/deploy/toggle은 건드리지 않고 final result는 `closed but release-ready`로 남긴다.
  Parallelization: Wave 4 | Blocked by: 1-11 | Blocks: F1-F4
  References (executor has NO interview context - be exhaustive): root `package.json` scripts `test`, `test:non-browser`, `verify`; `frontend/package.json` test/build/lint scripts; existing `.github/workflows` Node/PostgreSQL/browser patterns; `backend/tests/division-navigation-e2e.test.js` and `records-flow-e2e-*` for isolated Chrome/evidence patterns only; `backend/tests/test-cleanup-boundary.test.js` for safe evidence cleanup rules; `.node-version`.
  Acceptance criteria (agent-executable): exact Node 22.17.1 commands in Verification strategy all exit 0; root standard gate invokes every new backend test; workflow inventory proves required jobs are not env-skipped; PostgreSQL fresh+repeat migration passes; browser manifest lists exactly 4 viewports and all required scenarios; source fingerprint predates every PNG; public/member/admin payload recursive privacy scan is clean; evidence directory cleanup is confined to its validated child path; `git diff --check` passes; no package/lock dependency change unless existing manifests already require it.
  QA scenarios (name the exact tool + invocation): happy - run the exact browser command and open every generated PNG at original resolution, save `task-12/matrix-results.json`, `task-12/manifest.json`, and per-width images; failure - run dedicated hostile cases for missing policy/secret, forged actor, invalid membership/role, CSRF, 413, 429, identity-bearing DTO, alias collision, report duplication, paused server, and invalid evidence path, evidence `task-12/hostile-results.json`. Independently re-run the artifact verifier against frozen source before DoneClaim.
  Commit: Y | `test(community): gate anonymous pilot release`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE the same exact source fingerprint. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit - compare the implementation to every Must have/Must NOT have and all 12 DoneClaims; reject production enable/deploy, absolute-anonymity copy, missing policy gates, legacy API/table reuse, or omitted user journeys. Evidence `.omo/evidence/athletetime-anonymous-community-main/final-plan-compliance.md`.
- [ ] F2. Code quality and security review - independently inspect HMAC domain separation, secrets, strict DTOs, CSRF, auth/access roles, SQL boundaries, rate-limit privacy, migration constraints, retention, evidence cleanup, async UI, TypeScript safety and remove-ai-slops/pony-tail scope. Re-run focused backend/frontend gates; APPROVE only with no HIGH/MAJOR blocker. Evidence `final-code-security-review.md`.
- [ ] F3. Real manual QA - run exact Node 22.17.1 + installed Chrome against the production build and disposable loopback DB at 320/375/768/1280; personally open all fresh PNGs and verify guest/member/operator journeys, evergreen/meme aliases, feed-linked featured/recent comments, reaction/anchor focus, Korean wrapping, keyboard/focus, touch targets, overflow, no external network, console/page errors 0. Evidence `final-manual-qa.md` plus frozen manifest/screenshots.
- [ ] F4. Scope and release safety - verify exact diff/commit history contains only planned source/tests/docs/evidence, all legacy community/chat routes remain unchanged or closed as specified, runtime state is `closed`, no production migration/deploy/traffic change occurred, policy values/named operators remain an explicit owner gate, and rollback/pause preserves data. Evidence `final-scope-release-gate.md`.

## Commit strategy
- Keep one atomic commit per todo using the specified messages; test changes protecting a behavior stay in the same commit as that behavior.
- Before each commit, stage only that todo's named source/tests/docs; preserve unrelated dirty/untracked user work and never run reset/checkout over it.
- Do not squash away the TDD/security boundary history until final review; if a fix is needed, use a focused follow-up/fixup and re-run affected evidence at the new SHA.
- No branch push, PR publication, production migration, deploy, release-state change, or traffic action is part of this plan run. Those require the user to explicitly start execution and later authorize the external action after F1-F4.

## Success criteria
- `/` is observably community-first; guests see only truthful privacy guidance and human-reviewed `운영 정보`, while active verified members can use one dense anonymous feed.
- Same-thread commenters have stable cute aliases, post-author comments say `글쓴이`, and the same person receives a different alias in another thread; new assignment uses the reviewed 80:20 evergreen/meme catalog without changing stored aliases, and no trademark/identity/slur/celebrity/lyric terms appear.
- Browser/client identity fields cannot control ownership. Public/member/moderator DTOs and artifacts contain no account, email, IP, session, actor key, athlete identity, secret, or real user content.
- The new storage/API is isolated under `community_*` and `/api/community/*`; legacy posts/comments/reports and `/api/posts` remain closed and untouched.
- Membership, moderation and release roles are separate; report/hold/restore/sanction/audit/editorial flows work without exposing identities to ordinary moderators.
- Text post/comment/search/report/self-hide/participated/new-reply, positive-only reaction, feed-linked featured/recent comment, and human-reviewed editorial flows pass unit, contract, PostgreSQL, frontend, and 4-viewport real Chrome tests.
- The UI has no horizontal overflow, broken Korean words, inaccessible controls, or console/page errors at 320/375/768/1280 and keeps records/competition paths reachable.
- Missing secret, policy value, membership, role, CSRF, valid request size, or rate allowance fails closed with correct 401/403/413/429/503 behavior and `no-store`.
- All standard CI gates include the new tests and pass on exact Node v22.17.1; evidence is fresh, sanitized and bound to the final source fingerprint.
- Final runtime remains `closed` and no production deployment/migration occurs until the owner separately supplies exact policy values, names staffed roles, approves the release window, and accepts all four final verifier reports.

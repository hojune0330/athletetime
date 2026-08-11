# Owner Decision 05: Verified-Member Community and Chat

## OWNER DECISION REQUIRED

**Decision needed:** whether AthleteTime should keep all community writes and
chat closed, allow a small verified-member community-write pilot while chat
remains closed, or authorize a separately governed verified-member community
and chat beta.

**Status:** no option is approved by this packet. The conservative
recommendation is to keep the current closed posture until the owner selects
an option and every prerequisite and release test below has passed.

This packet is a decision record, not an implementation authorization. It
does not approve a public chat, a new community write surface, a data
migration, account-to-athlete linkage, or any legal conclusion.

## Current Closed State

The current repository behavior is deliberately fail-closed:

- /community is a preparation surface; public community writes are not live.
- /chat is a preparation surface, not an operating chat service.
- Direct requests to /api/chat/* are rejected with 503 and
  Cache-Control: no-store.
- A direct /ws/chat handshake is rejected with 503.
- Legacy chat/community designs include browser-provided identity and report
  inputs. Those values are not a safe authority source and must not be
  activated, migrated into member identity, or exposed in a new API.

**Not approved: remain closed/current behavior.** Keep the preparation
surfaces and the HTTP/WebSocket fail-closed protections in place. This packet
does not direct work to weaken or bypass those protections.

## Options For Owner Selection

| Option | Scope after a separate implementation and release review | Trade-off |
| --- | --- | --- |
| A. Keep closed **(recommended pending owner confirmation)** | Keep community writes and chat closed. Continue only read-only, reversible public-record work. | Lowest data, moderation, and operational risk; no member interaction yet. |
| B. Verified-member community-write pilot; chat stays closed | Permit only explicitly approved community writes such as posts/comments for verified members. Keep /chat, /api/chat/*, and /ws/chat closed. | Creates an accountable moderation workload while limiting the live protocol and real-time abuse surface. |
| C. Verified-member community and chat beta | Permit the Option B scope plus a limited real-time chat beta only after all chat-specific prerequisites pass. | Highest operational and irreversibility burden; real-time content, reporting, and connection abuse require continuous coverage. |

If the owner does not explicitly select an option, Option A remains in force.
If the owner selects B or C, the owner must record the values in the next
section before implementation starts. Selecting B does not imply C.

## Decisions That Must Be Recorded

The owner must decide and record all of the following for the selected scope:

| Area | Owner decision required |
| --- | --- |
| Membership | Eligibility and verification evidence; whether email verification is sufficient; age/minor and guardian handling; account recovery/appeal path. |
| Display identity | What public display name is allowed, rename rules, collision handling, and the prohibition on implying athlete verification or account-to-athlete ownership. |
| Origin and session | Approved HTTP and WebSocket origins, session lifetime/re-authentication expectation, and how an authenticated server session is bound to each write/connection. |
| Throttling | Per-account, per-network, room/endpoint, message-size, payload-shape, and connection limits; response behavior; appeal/escalation for false positives. |
| Moderation | Prohibited-content rules, temporary-hide and restore authority, human-review queue, suspension/escalation authority, and coverage hours. |
| Reporting | Report categories, bounded reporter detail, duplicate-report handling, review targets, reporter and subject notice, and whether any temporary action is automatic. |
| Retention | Exact retention periods and deletion/anonymization treatment for messages, reports, moderation decisions, rate-limit state, and audit logs. |
| Legacy content | Whether legacy anonymous content remains separately visible, is blinded/deleted through an existing request process, or is retired. It must never be silently linked to a member account. |

No assumed threshold, retention period, minor policy, or moderation action in
this packet is a final policy value.

## Required Safety And Data Contract

Any later implementation for Option B or C must meet these minimum boundaries:

1. The server derives the writer, chat participant, and reporter from the
   authenticated server session. A browser-provided user ID, nickname key,
   reporter key, or similar value must never grant identity or reporting
   authority.
2. Public responses and moderation queues must not disclose raw account IDs,
   session identifiers, browser-provided identity keys, reporter keys, network
   addresses, or internal abuse-scoring fields.
3. Stateful HTTP requests use the established session and CSRF protections.
   WebSocket upgrades require both an authenticated server session and the
   owner-approved strict origin policy; origin is not a substitute for
   authentication.
4. The server enforces the owner-approved rate, payload, and connection limits
   before persisting content or broadcasting it. Client timers, hidden fields,
   and client-side report counts are advisory only.
5. A report identifies a server-issued content target and an allowed reason;
   the server derives the reporter and makes duplicate, threshold, visibility,
   and audit decisions. The legacy browser-supplied reporting design is not a
   migration source.
6. Content, report, and moderation records are separated by access role. Only
   the minimum data required for operation, appeal, and approved retention is
   retained. Secrets, session tokens, verification codes, and raw identity
   values are never placed in content, report detail, or ordinary logs.

## Operational Duties And Retention

Before a public beta, a named release owner must confirm that named operators
can perform these duties for the approved scope:

- review reported content, temporary restrictions, and restoration requests
  within the owner-approved service target;
- record who made each moderation action, why, when it expires or is reviewed,
  and the applicable policy version without copying secrets or unnecessary
  personal data;
- respond to valid access, deletion, anonymization, and correction requests
  according to the approved retention policy;
- protect operator access with least privilege, authenticate each action, and
  audit privileged actions without exposing the audit trail publicly;
- monitor rate-limit saturation, report-queue backlog, connection failures,
  and abuse signals without treating logs as a source of public identity; and
- pause the beta immediately when moderation coverage, storage, or abuse
  controls are unavailable.

Retention must be specified separately for active content, removed/blinded
content, reports, moderation decisions, abuse/rate-limit records, and
operator audit records. A deletion request is not permission to erase records
needed for an active, owner-approved safety review; the exact exception and
duration require the owner to define them. This is an operational policy
requirement, not a claim of legal sufficiency.

## Irreversibility And Prerequisites

Opening a member interaction surface is not a toggle. Public messages can be
copied, quoted, cached, or acted on before a later correction or removal.
Member/account associations, report evidence, and moderation decisions can
also create obligations that a simple UI rollback cannot undo. A database
migration, retention purge, or legacy-content treatment must therefore be
designed as a forward-only, rehearsed change with an explicit data-preservation
decision.

Do not begin implementation unless all applicable prerequisites are complete:

1. The owner has selected Option A, B, or C and completed every decision in
   the decision table above.
2. The separate account/privacy consent and session work is approved for the
   selected member scope, including any minor/guardian rule.
3. The server-side identity, strict origin, CSRF, payload validation,
   throttling, report, moderation, retention, and audit contracts have an
   approved design review.
4. A staffed moderation and escalation runbook exists, with access control,
   queue ownership, incident handoff, and a beta-pause procedure.
5. A disposable-environment migration and rollback rehearsal proves that
   legacy anonymous content cannot become attributed to a member by mistake.
6. The release owner has reviewed the executable tests and a controlled
   staging observation period has completed without an unresolved safety issue.

## Rejection And Rollback

If the owner rejects the decision, any prerequisite fails, or release evidence
is incomplete, no interaction feature ships: the preparation surfaces and
current 503/no-store chat protections remain the release behavior.

For a future approved beta, the first rollback action is to stop new
community/chat entry and restore the preparation and fail-closed boundary
before considering any database action. Preserve the minimum protected
moderation, report, and release evidence required by the approved retention
policy. Do not delete, anonymize, or reassign content merely to make a rollback
look clean; those actions need their own documented authority and rehearsal.

## Executable Release Tests

### Current closure baseline

Run these existing checks before any decision review and before any later
implementation starts:

    node --test backend/tests/launch-interaction-safety.test.js backend/tests/deployment-wiring.test.js

Expected result: tests pass while chat HTTP requests and the /ws/chat
handshake remain unavailable, and the HTTP responses remain non-cacheable.

### Required implementation-release suite

An Option B or C implementation is not release-ready until the following test
files exist, are included in the normal test command, and pass in an isolated
test environment:

    node --test backend/tests/verified-member-community-release.test.js backend/tests/verified-member-chat-ws.test.js backend/tests/community-moderation-retention.test.js

The suite must prove all of the following:

- forged browser identity, nickname, reporter, report-count, and target-owner
  inputs cannot write, report, or impersonate another member;
- absent/expired sessions, failed CSRF checks where applicable, and disallowed
  origins cannot create content or establish a chat connection;
- owner-approved account/network/room/payload limits reject abuse before
  persistence and do not expose internal keys in their response;
- reports are deduplicated from the authenticated reporter, queued for the
  approved action, and hidden from public/API payloads unless the approved
  viewer role needs them;
- a moderator can apply, audit, appeal/restore, and expire an action according
  to the selected policy; and
- retention, deletion/anonymization, and a paused-beta rollback preserve only
  the approved data classes and never attach legacy anonymous material to a
  member account.

The release owner must additionally run two browser clients against staging:
one permitted member and one denied/limited member. The observation must show
that no browser-provided identity/report key is trusted and that an operator
can pause the selected surface without opening chat routes outside the approved
scope.

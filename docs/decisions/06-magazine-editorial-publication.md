# Owner Decision 06: Magazine and Editorial Publication

## OWNER DECISION REQUIRED

**Decision needed:** whether AthleteTime should keep editorial publication
closed, run a human-reviewed manual competition-cycle pilot, or prepare a
strictly human-approved assisted editorial workflow.

**Status:** no option is approved by this packet. The conservative
recommendation is to keep editorial publication closed until the owner records
the scope, roles, source/retention choices, correction process, and successful
release evidence below.

This is a decision packet, not permission to collect, scrape, draft, approve,
schedule, or publish content automatically. It does not provide legal
clearance for a source, a claim, a quotation, a name, or a publication.

## Current Closed State

The current planning and release posture is closed for automated editorial
work:

- No automated news collection, drafting, approval, scheduling, or publication
  is authorized by this packet.
- The existing editorial release gate requires
  NAVER_NEWS_COLLECTOR_ENABLED=false and
  EDITORIAL_SCHEDULER_ENABLED=false, or both unset, for its protected release
  path.
- The repository's public-record work is not a daily news feed and does not
  establish an editorial article as an official result or athlete narrative.
- A current source range, a correction route, and human approval are required
  decision gates before any generated news or athlete narrative is public.

This packet does not assert the live deployment's environment values. It
records the current required release posture and does not change it.

**Not approved: remain closed/current behavior.** Keep automated collection
and scheduler capabilities disabled or unset, and do not broaden scraping,
source acquisition, or public editorial output through this decision packet.

## Options For Owner Selection

| Option | Scope after a separate implementation and release review | Trade-off |
| --- | --- | --- |
| A. Keep publication closed **(recommended pending owner confirmation)** | No public magazine/editorial publication. Continue public-record discovery and corrections only. | Lowest claim, source, correction, and operational risk. |
| B. Manual competition-cycle pilot | A named human prepares and publishes a small, owner-defined set of competition-cycle pieces from individually documented, owner-approved sources. Every item has human approval; no background collection, scheduler, or automated publication. | Creates a limited editorial operation while keeping volume and source intake narrow. |
| C. Human-approved assisted workflow | Tools may help prepare private drafts only from source receipts supplied by the editor. A named human reviewer approves each public item; no tool may publish, schedule, or expand source collection. | Higher review and provenance load; still requires a human per-item decision and a bounded source inventory. |

If the owner does not select an option, Option A remains in force. Selecting B
or C authorizes no code by itself and does not authorize a scraper expansion,
automated publishing, or a legal conclusion.

## Decisions That Must Be Recorded

The owner must specify these values for an approved B or C pilot:

| Area | Owner decision required |
| --- | --- |
| Publication scope | Competition types, season/region, eligible subject matter, language, and content excluded from the pilot. |
| Cadence | The competition-cycle schedule: pre-event, post-event, between-event, and off-season cadence; maximum backlog; pause conditions; and time zone. A daily-news expectation is not the default. |
| Roles | Named author/preparer, independent human approver, release owner, correction owner, and backup/escalation coverage. The recommendation is separate preparer and approver roles. |
| Source inventory | Exact approved source classes and domains, intake owner, receipt format, and a rule that a new source requires a new owner decision rather than automatic expansion. |
| Claim standard | What may be stated as collected public-record context, what needs direct support, how uncertainty is marked, and what must never be presented as official or verified. |
| Publication gate | Required human sign-off fields, review checklist, preview process, canonical URL/ID, and the action that prevents publication if a receipt or approval is missing. |
| Correction path | Public correction contact/route, required intake data, acknowledgement/status wording, review authority, correction-note/retraction standard, and retention of correction evidence. |
| Retention | Exact periods and access rules for drafts, source receipts, approval records, published revisions, corrections, and operator audits. |

No current source, publication cadence, approver, retention period, or claim
standard is silently approved by this packet.

## Human Approval And Source Receipt Contract

Every future public editorial item must be blocked unless a named human
approver records approval for that exact revision. Approval is not a blanket
approval for a feed, a source domain, a model output, or a future competition.

Before approval, the reviewer must verify a source receipt with at least:

- the publication/item identifier and exact revision under review;
- source title/publisher or record authority, URL or durable locator, and the
  time it was accessed;
- the competition/date range and factual claims the source supports;
- a concise acquisition note that distinguishes editor-supplied material from
  any approved manual lookup; and
- a visible correction route and the provenance/source-range wording intended
  for readers.

Receipts are internal operational evidence. They must not contain credentials,
tokens, private contacts, copied source archives, or more personal data than
the approved review needs. A receipt does not itself establish permission to
reuse source material or prove a claim is legally safe.

For Option C, tools may assist only inside the private draft workflow and only
from the editor-supplied receipt set. They cannot submit an item for public
publication, initiate a collection job, access a new source, change an
approved item after sign-off, or publish on a timer.

## Correction And Data Duties

Every published item needs a stable public identifier and a visible correction
route. The correction owner must log receipt, scope, evidence reviewed,
decision, revision/retraction link if applicable, and the policy version used.
The public response should be accurate about status without exposing a
requester's contact details, internal notes, source credentials, or reviewer
identifiers.

The operating team must:

- keep drafts, receipts, approvals, corrections, and audit records role
  separated and available only to the minimum necessary staff;
- retain each data class only for the owner-approved period, with a documented
  purge/review process and protected exception process where the owner has
  defined one;
- preserve revision history and correction evidence long enough to support the
  approved correction process rather than silently overwriting a disputed
  claim;
- ensure that a correction to editorial copy does not automatically alter an
  underlying public record, athlete identity, or source dataset; and
- stop new publication when the human approver, correction owner, source
  receipt, or access controls are unavailable.

This records operational requirements only. It does not claim that a chosen
retention, correction, or sourcing practice is legally sufficient.

## Irreversibility And Prerequisites

Public editorial claims may be copied, indexed, cached, translated, or quoted
before a correction. A later edit, retraction, or traffic rollback cannot fully
recall those copies. Deleting source receipts or approval history can also
erase the evidence needed to correct a claim. Treat publication, retention
purges, and source-inventory changes as deliberate, reviewable operations.

Do not begin an Option B or C implementation unless all applicable
prerequisites are complete:

1. The owner selected B or C and completed every required decision above.
2. The approved source inventory is documented, access is controlled, and a
   new domain/source has no automatic intake path.
3. The publication workflow technically prevents public release without a
   per-revision human approval and a complete receipt.
4. Reader-facing provenance/source-range and correction information is present
   in preview and public views, without treating collected public records as
   official results.
5. Named operators can review corrections, issue an owner-approved revision or
   retraction, and preserve the needed evidence according to the retention
   policy.
6. The collector and scheduler remain disabled or unset during staging and the
   observation period. A manual pilot may not become an automated one through
   configuration, a background job, or a source-list default.
7. The release owner has reviewed the release tests below and completed a
   controlled staging observation with no unresolved source, approval, or
   correction failure.

## Rejection And Rollback

If the owner rejects the decision, a receipt is incomplete, human approval is
missing, or correction operations are unavailable, no public editorial item is
released. Current closed behavior continues, with automated collection and the
scheduler disabled or unset.

For a future approved pilot, first stop new publication and restore the closed
publication gate before considering data changes. Preserve the minimum
protected receipt, approval, revision, and correction evidence required by the
approved retention policy. Use a visible correction or retraction path for a
published error; do not silently rewrite a disputed article or purge evidence
solely to make a rollback appear complete. Any destructive data operation
requires its own owner-approved rehearsal.

## Executable Release Tests

### Current closure baseline

Before any decision review or implementation work, confirm the protected
configuration expectation is still documented and the repository's existing
launch safety checks pass:

    rg -n "NAVER_NEWS_COLLECTOR_ENABLED=false|EDITORIAL_SCHEDULER_ENABLED=false" docs/athletetime-editorial-release-gate.md
    node --test backend/tests/launch-interaction-safety.test.js backend/tests/deployment-wiring.test.js

Expected result: both documented flags are found, the safety checks pass, and
the release does not treat the legacy chat/currently prepared surfaces as live
features.

### Required implementation-release suite

An Option B or C implementation is not release-ready until the following test
files exist, are included in the normal test command, and pass in an isolated
test environment:

    node --test backend/tests/editorial-publication-gate.test.js backend/tests/editorial-source-receipt.test.js backend/tests/editorial-correction.test.js

The suite must prove all of the following:

- no API, job, retry, or direct database path can publish an item without the
  exact revision's recorded human approval;
- disabled/unset collector and scheduler settings generate no provider call,
  draft, queue item, scheduled item, or publication;
- a draft lacking an approved source receipt, source/time/range, or public
  correction route is rejected before preview/publication;
- a private draft tool cannot add sources, publish, schedule, or alter an
  already approved revision;
- a correction creates a reviewable new revision or approved retraction,
  preserves the required audit trail, and does not modify the underlying
  record dataset automatically; and
- a source-inventory change, retention purge, or rollback attempt requires the
  owner-approved path and does not delete protected correction evidence.

The release owner must manually inspect a staging preview of one approved item
and one rejected item. The approved preview must show the chosen source range
and correction route; the rejected item must remain unpublished with no
automated fallback. Record only aggregate pass/fail evidence, never secrets,
source credentials, requester contacts, or private draft text in public issue
or release notes.

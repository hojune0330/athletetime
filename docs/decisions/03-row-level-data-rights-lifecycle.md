# Decision 3: Row-Level Data-Correction, Hiding, and Deletion Lifecycle

**Status: OWNER DECISION REQUIRED**

This packet asks the owner to decide whether AthleteTime may ever apply a
reviewed request to one narrowly identified public-result row. It does not
approve an implementation, change a live row, or reach a legal conclusion.

## Current boundary

- The existing data-request and suppression behavior remains the only active
  path. This packet creates no source-record field, new request payload,
  automatic action, or new suppression mode.
- A correction or hide request is not proof of identity, ownership, or a
  right to alter an underlying public source. Same-name candidates remain
  separate.
- Public record and team responses must not disclose internal source-record
  identifiers. A future action key, if approved, must stay internal and must
  not appear in a public URL, response, log, or operator-visible search
  shortcut.
- The current policy treats display/search suppression as the ordinary
  response; raw-data deletion is not the ordinary user-facing remedy. No
  automatic live-row change is permitted.

## Decision required

The owner must choose the permitted action set, evidence threshold, reviewer
authority, public status wording, and retention period before implementation.

| Option | Decision | Consequence |
| --- | --- | --- |
| 1 | Keep the row-level feature closed. | Continue the existing request flow only; no request can target a source-record row. |
| 2 | Permit a reviewed, internal-keyed correction or display/search hide for one row at a time. | Requires a stable internal record key, documented evidence review, a two-person or equivalent approval rule, retention limits, and a repair rehearsal before release. Raw deletion remains closed. |
| 3 | Permit exceptional, separately approved raw-data deletion. | Adds an irreversible data-loss path and requires a separate owner approval, backup/recovery evidence, and incident procedure for each deletion class. |

**Conservative recommendation, pending owner confirmation: Option 1. Keep the
row-level feature closed.** It leaves the current request path intact while the
identifier, evidence, lifecycle, and recovery contract remain undecided.

**Not approved: remain closed/current behavior.** Do not add a row-level
action, source-record lookup field, live-row automation, or public source
identifier.

## Data touched if an option is approved

No data is touched by this document. A future approved design would need to
minimize and separately govern only:

- The existing request ticket, request category, minimal contact data, and
  review timestamps.
- A non-public, stable internal record reference and the exact requested
  action. The reference must not be derived from a name alone and must not be
  exposed to a requester or public client.
- The minimum review evidence, reviewer decision, reason code, and an action
  receipt. Do not persist unnecessary identity documents, raw source copies,
  or unrestricted free-text evidence.
- A suppression or correction state that applies to exactly one reviewed
  record scope, plus its expiry or review date.

The existing data-rights retention schedule is the baseline for request and
contact fields: identifiable request fields and the public lookup key are
anonymized after three years; contact data follows its earlier 90-day/terminal
closure limit; active suppression exists only while needed; and protected
backups expire within 35 days. A row-action evidence period is not decided by
this packet and must be set by the owner before implementation.

## Irreversible effects and limits

- A hide can remove a public result from display/search. A correction can
  change what is displayed for a historical result. Neither effect is a
  harmless UI rollback.
- Raw-data deletion can make a record unrecoverable after the approved backup
  window expires. It must never be performed as an automatic response to a
  ticket.
- A stable internal key can create a durable link between an action and a row.
  It therefore requires access control, minimization, and retention limits.
- Reverting code does not itself restore, delete, or otherwise alter a live
  row. Any reversal must be a new, documented, reviewed action against the
  same internal scope.

## Preconditions before implementation

1. The owner selects one option and records the permitted action vocabulary:
   correction, display/search hide, deletion, objection, and any expiry.
2. The implementation has a stable internal record reference that proves a
   single-row scope without exposing a source identifier through a public
   route, URL, response, log, or client state.
3. Evidence requirements, reviewer roles, conflict handling, and public
   request-status wording are approved. A name match, affiliation, or a
   browser selection is insufficient evidence on its own.
4. Retention, anonymization, receipt access, backup expiry, and a manual
   reversal procedure are documented. The existing data-rights policy remains
   the floor where it applies.
5. A disposable PostgreSQL rehearsal proves forward repair and recovery for
   the approved schema/action state. A production migration is not authorized
   by this packet.
6. The data-rights rollout runbook's backup, dry-run, shadow comparison,
   readiness, and stop conditions are separately satisfied after the required
   policy approval. This packet is not an instruction to run its write steps.

## Rejection and rollback

- **Owner rejects or defers:** retain the current request flow and make no
  row-level schema, route, or data change.
- **Pre-release gate fails:** keep the feature unavailable, preserve only
  approved aggregate evidence, and investigate without changing live rows.
- **Approved feature needs reversal:** disable the feature or route first;
  then use a newly reviewed corrective receipt for a specific row. Do not use
  a code rollback to mass-restore, mass-hide, or mass-delete records.
- **Deletion request is disputed or ambiguous:** stop. Do not infer a target
  row and do not convert the ticket into automatic suppression or deletion.

## Executable release tests

### Current-boundary regression gate

Run the existing data-rights suite before and after any proposed work:

```powershell
npm run test:data-rights
```

It includes the current scope and fail-closed regression coverage in
`backend/tests/data-rights-lifecycle.test.js` and the storage/logging boundary
coverage in `backend/tests/data-rights-boundaries.test.js`.

### Required new release scenarios

Before Option 2 or 3 can ship, add focused tests and run them with the current
suite. The release is blocked unless all of these scenarios pass:

```powershell
node --test backend/tests/data-rights-row-action.test.js backend/tests/data-rights-lifecycle.test.js backend/tests/data-rights-boundaries.test.js backend/tests/data-rights-postgres.integration.test.js
```

- Two same-name or similar public records: an approved action for one internal
  record reference does not affect the other.
- Ambiguous, missing, altered, or public-supplied record references: rejected
  without an action and without disclosing a valid internal reference.
- Correction, hide, objection, expiry, and any permitted reversal: each follows
  the selected owner lifecycle and emits a minimal receipt only.
- Storage or cache failure: public exposure fails closed; no action is guessed
  or broadened.
- Disposable PostgreSQL repair/recovery: the approved state is repeatable and
  rollback does not perform automatic live-row changes.

## Related existing boundaries and evidence

- [Data privacy guardrails](../data-privacy-guardrails.md) for current
  retention, no-store, backup, and non-legal-conclusion boundaries.
- [Private vault release boundary](../athletetime-private-vault-release-boundary.md)
  for the separate account-private storage boundary; it is not a source of
  authority for public-row actions.
- [Data-rights rollout runbook](../data-rights-rollout-runbook.md) for the
  approval, backup, dry-run, shadow, readiness, and stop conditions that would
  govern a separately approved storage rollout.
- [Data-rights lifecycle tests](../../backend/tests/data-rights-lifecycle.test.js),
  [data-rights boundary tests](../../backend/tests/data-rights-boundaries.test.js),
  and [PostgreSQL integration tests](../../backend/tests/data-rights-postgres.integration.test.js)
  for current regression anchors.

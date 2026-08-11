# Team Small-Group Aggregate Threshold and Terminology

## OWNER DECISION REQUIRED

This packet does not select a threshold, youth or school exception, disclosure
format, or public term. Only a written owner choice may authorize a later
implementation. Until then, the current public aggregate boundary remains in
place and no new team field, count, drilldown, chart point, sort hint, or API
response is added.

## Current behavior

- The release matrix says that a `season x event x division` breakdown can
  identify a child or an athlete. It requires an owner-set threshold, a choice
  of hidden or redacted behavior, and server-side application before charts or
  detailed filters ship. See [the release matrix](../athletetime-persona-release-matrix.md#L58).
- The public team boundary excludes `name`, `athleteKey`, `records`,
  `affiliations`, `workspace`, `note`, `attachment`, and `sourceId`; the memo
  identifies `backend/tests/team-public-dto-boundary.test.js` as its recursive
  contract. See [the team memo](../athletetime-persona-team-memo-boundaries.md#L14).
- The team memo records that sparse school or team views currently expose
  summaries such as one competition, one event, or one record. It explicitly
  says this observed behavior is not approval for small-group disclosure. See
  [the team memo](../athletetime-persona-team-memo-boundaries.md#L75).
- Existing terminology keeps `participating athlete count` out of the primary
  metrics because it can resemble an official roster. If a count is later
  approved, the documented limiting wording is "athletes appearing in records
  collected by this site," not a roster claim. The memo instead defines the
  four current summary concepts as unique indexed competitions, confirmed
  placements 1-3, comparable record improvements, and unique events. See
  [the team memo](../athletetime-persona-team-memo-boundaries.md#L28).

## Decision options

1. **Keep the present boundary.** Do not add a threshold-driven disclosure
   feature, athlete count, granular slice, new chart, or new sort behavior.
   Continue the existing aggregate-only team surface and terminology limits.
2. **One disclosed baseline.** Adopt the team memo's already documented
   baseline: hide every detailed cross-aggregate with fewer than five unique
   athletes, and define the exact slice dimensions, suppressed response shape,
   and approved labels. The rule applies server-side to numbers, chart points,
   and sort hints together.
3. **Baseline plus youth/school protection.** Use the same documented
   below-five baseline for all detailed cross-aggregates, and record a separate,
   higher owner-selected floor for school or youth groups. The owner must also
   define how a group is classified and how unknown classification is handled;
   no classifier or exception is implied by this packet.

## Recommendation (not approved)

Choose option 1 until the owner can record a complete disclosure rule and the
evidence below is available. The current sources establish the risk and a
memo-level baseline, but they do not approve a public threshold, a youth/school
definition, a bucket format, or any new numeric display.

## Data touched

No data changes occur from this packet. A later approved implementation would
read only the public-record-derived membership necessary to calculate a unique
athlete count for an owner-defined aggregate slice. It must not add or return
names, athlete keys, raw records, affiliations, source IDs, workspace state,
notes, attachments, private-vault data, or an account-to-team join.

## Irreversibility

Once a small aggregate has been publicly displayed, a code rollback cannot
recall what viewers observed or copied. Threshold expansion therefore requires
a release decision rather than a presentation-only change. Suppressing a value
later is technically reversible, but it cannot undo prior disclosure.

## Prerequisites

- Written owner selection of one option and, if applicable, the exact slice
  dimensions, threshold(s), school/youth classification, unknown-classification
  behavior, hide-versus-bucket behavior, and approved terminology.
- Server-side DTO suppression that removes a suppressed value and its chart
  point, ordering signal, and related derived value together.
- Source-range, last-observed-date, and exclusion wording visible wherever an
  approved public aggregate is rendered, as required by the release matrix.
- Fixture-backed API and UI coverage for ordinary, sparse, youth/school, and
  unknown-classification groups without introducing a personal-data field.

## Rejection and rollback behavior

If the owner rejects or defers every option, do not create a threshold rule or
expand team output. If a later approved release fails a suppression or
terminology test, stop that release, remove the newly introduced public output,
and return to the prior aggregate-only response. Do not compensate by exposing
raw rows or by weakening the existing forbidden-field boundary.

## Executable release tests

- Run `node --test backend/tests/team-public-dto-boundary.test.js`; it must
  confirm that the forbidden personal, workspace, note, attachment, and source
  fields are absent recursively.
- Run `node --test backend/tests/records-flow-e2e.test.js`; its team-detail
  flow must still open on the latest observed season without a selected granular
  scope.
- Before any chosen option is released, add a fixture test and run it with
  `node --test backend/tests/team-small-group-suppression.test.js`. It must
  verify: values below the selected floor have no number, chart point, sort
  hint, or derived detail; a school/youth and an unknown-classification fixture
  follow the owner-recorded rule; and allowed aggregates still contain no
  forbidden DTO key. This command is a future release prerequisite, not an
  authorization to add the test or feature now.

## Not approved: remain closed/current behavior

No threshold, youth/school variation, numeric athlete count, team roster term,
granular distribution, or suppression implementation is approved by this
packet. The feature remains closed to expansion and the current behavior above
continues.

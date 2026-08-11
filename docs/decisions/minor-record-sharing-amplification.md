# Minor Record Sharing and Amplification

## OWNER DECISION REQUIRED

This packet records an unresolved distribution-policy gate. It does not
approve a new sharing rule, an age classifier, a youth-team classifier, a
share-link restriction, or a change to public record coverage. A written owner
choice is required before the product changes how a public record link can be
shared or promoted.

## Current behavior

- A visitor can open a collected public record through a direct link and use a
  browser share action where the browser supports it. The record display does
  not claim that a person is the account holder or that the record is official.
- Athlete identity is deliberately unresolved: same-name candidates are not
  automatically merged, and the collection does not store or use a public
  birthdate or person number to decide that someone is a minor.
- The existing minor policy is conservative about active amplification, but a
  generic share action can still distribute any currently visible public
  record. This is a policy tension, not a solved age determination problem.
- Correction and hiding requests remain available. They are an important
  remedy, but they do not recall a link or screenshot already shared outside
  AthleteTime.

## Decision options

1. **Keep the present direct-link behavior.** Retain browser sharing for
   visible public records, do not create an age or youth classifier, and do
   not add promotional cards, automatic recommendations, or social publishing.
   Keep the correction/hiding route clear and do not describe sharing as
   athlete-approved.
2. **Restrict active amplification only.** Keep ordinary direct links and
   browser sharing, but prohibit product-generated share cards, featured
   athlete prompts, automatic recommendations, and editorial reuse when the
   record is reasonably likely to concern a youth athlete. The owner must
   define the evidence threshold and treatment of unknown cases.
3. **Owner-defined youth sharing policy.** Before implementation, the owner
   supplies the classifier inputs, error handling, link/share behavior,
   guardian or athlete request process, review authority, retention, and
   rollback procedure. This option may restrict links or sharing only after
   the classification and remedy rules are explicit.

## Recommendation (not approved)

Choose option 1 until the owner supplies the precise protection rule required
by options 2 or 3. Do not infer age from a name, team label, event, season, or
record quality. Do not use a disclaimer as a replacement for a distribution
rule.

## Data touched

This packet changes no data. A later option must document every classification
input and must not introduce a birthdate, person number, account-to-record
link, guardian evidence, or private contact field unless separately approved
under the account and private-data decisions.

## Irreversibility

A shared URL, screenshot, browser-preview card, or repost can be copied
outside the service. Removing a control later cannot recall that distribution.
This is why the decision is about amplification and remedy before the UI is
expanded, not after a campaign has started.

## Prerequisites

- A written owner selection, including whether ordinary browser sharing counts
  as active amplification and how unknown youth status is handled.
- Explicit wording for record cards, any share sheet, correction/hiding
  requests, and editorial reuse. No text may claim athlete approval or an
  official ranking.
- A tested suppression path that prevents a hidden record from being offered
  in product-generated share or promotion surfaces.
- A documented review and rollback path for an incorrect classification or a
  request to stop amplification.

## Rejection and rollback behavior

If every option is deferred, keep the current direct-link behavior but do not
add share cards, featured-athlete modules, automatic recommendations, or
automated editorial reuse. If a later approved policy fails a suppression or
remedy test, disable only the newly approved amplification surface first; do
not remove public record data or create an account identity link as an
emergency shortcut.

## Executable release tests

- Keep `node --test backend/tests/athlete-user-ux.test.js
  backend/tests/public-provenance-correction-boundary.test.js` green so a
  visible record keeps a correction route without exposing internal identity
  fields.
- Before any option that changes sharing is released, add and run
  `node --test backend/tests/minor-record-sharing-policy.test.js`. It must
  prove the owner-selected rule for youth, non-youth, and unknown fixtures;
  the absence of unsupported official/approval claims; hidden-record removal
  from every product-generated share surface; and a correction/hiding route.
  This future test is a prerequisite, not permission to implement the feature
  now.

## Not approved: remain closed/current behavior

No age classifier, youth classifier, promotion, automatic recommendation,
share-card publisher, editorial reuse, guardian evidence, or account-to-record
link is approved by this packet. The unresolved amplification boundary remains
closed to expansion while ordinary existing direct links continue to use the
current public-record boundary.

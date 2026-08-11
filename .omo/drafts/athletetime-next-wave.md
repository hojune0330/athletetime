# Draft: AthleteTime Persona-Led Next Wave

## Requirements (confirmed)
- Continue practical safety and usability work without waiting for a new command.
- Keep high-impact privacy, minor, data-rights, publication, and community decisions for the owner.
- Treat the public record search and team views as trust-sensitive surfaces.
- Do not reopen community, chat, private notes/photos, or automated editorial publishing by implication.

## Technical Decisions
- Keep public interaction surfaces fail-closed until an owner decision and release gate exist.
- Prefer small, contract-tested improvements that do not collect data, change public disclosure scope, or change a historical record.
- Preserve the current record-search, same-name separation, local-only workspace, and provenance boundaries.

## Research Findings
- Public route internal-error exposure was repaired and regression-tested in main commit `00f5acf`.
- PaceRise URL recovery, workspace final-subject removal, local cleanup truthfulness, and closed interaction gates already have browser-level contracts.
- Team small-group disclosure, account/minor consent, private vaults, row-level lifecycle, verified community/chat, and editorial publication remain owner-decision gates in `docs/decisions/`.

## Open Questions
- Owner choices are required only for the six documented decision gates; none will be inferred in this plan.

## Scope Boundaries
- INCLUDE: verification-driven safe maintenance, error recovery, accessibility and navigation regressions, operational observability that excludes personal query/value logging, and release evidence.
- EXCLUDE: new public aggregate disclosure, account policy collection, age/guardian flows, private uploads, public writing/chat, raw-data deletion, automatic editorial collection or publication.

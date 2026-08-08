# Draft: AthleteTime Safe Personal Space and Record UX Next Steps

## Requirements (confirmed)
- Find better approaches and improvements using diverse user personas and agent reviews.
- Start improvement planning now.
- Keep high-impact decisions for the owner later; continue only reversible, safe work autonomously.
- Preserve public-record integrity, same-name separation, youth privacy, and the aggregate-only team boundary.

## Technical Decisions
- Treat public record exploration, team statistics, account collections, private notes, photos, and chat as six separate release boundaries.
- Keep the current public record wording and collection improvements as safe work; do not make a collection into a claimed athlete profile.
- Require durable public references before account persistence.
- Keep private notes text-only before considering photos; never reuse the public Cloudinary upload route.
- Freeze chat expansion until server-authenticated identity, reporting, origin validation, and operational readiness are separately approved.

## Research Findings
- Existing release plan: `.omo/plans/athletetime-personal-space-release.md` defines G1-G6 gates and safe Wave 1 work.
- Team plan: `.omo/plans/team-performance-dashboard.md` already implements an aggregate-only dashboard, but owner choices remain for initial period and small-group suppression.
- Persona review: team API must omit personal identifiers and suppress cross-groups below five unique athletes.
- Security review: current public upload returns a public Cloudinary URL; private images must be a separate future storage path.
- Safety review: current chat accepts browser-selected identity and reporting values; no expansion is safe without a replacement design.

## Open Questions
- G2: team initial period (`latest`, `all`, or user-first selection).
- G3: minimum aggregation threshold and exact redaction display.
- G4: durable `subject_uid` and `record_uid` contract for account persistence.
- G5: text-note recovery period, re-authentication policy, and storage/key operational responsibility.
- G6: whether existing chat stays disabled or receives a separately governed limited beta.

## Scope Boundaries
- INCLUDE: safe record-language/QA improvements, decision records, release sequencing, measurable security and UX checks.
- EXCLUDE: automatic identity claims, account-to-athlete linking, private photos, chat expansion, public team rosters, and policy choices reserved for the owner.

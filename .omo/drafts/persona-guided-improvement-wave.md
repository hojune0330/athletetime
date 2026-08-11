# Draft: Persona-Guided Improvement Wave

## Requirements (confirmed)
- Improve AthleteTime by actively testing it through many realistic and adversarial user perspectives.
- Continue safe, reversible improvements without waiting for an additional command.
- Leave high-impact choices for the owner to decide later.

## Research Findings
- 36-persona roadmap and a 30-scenario release matrix already exist and remain the planning baseline.
- Sensitive identifiers in data-rights reasons are already rejected before storage, with regression coverage.
- Same-name candidates remain separate, stale record-workspace selection can be cleared, and pole-vault normalization has regression coverage.
- Chat and unfinished community write paths are fail-closed; reopening them would be a separate authentication and moderation project.
- Team summary data is aggregate-only, but small-cohort disclosure requires an owner-set server-side threshold before expansion.
- Private notes and photos cannot use the existing public upload path and remain intentionally deferred.

## Technical Decisions
- Do not duplicate previously completed fixes; verify and retain their tests.
- Sequence work as: public flow resilience, truthful browser-local data controls, then owner-approved privacy-boundary projects.
- Treat policy thresholds, retention, minor safeguards, account linkage, and community reopening as decision gates rather than implementation assumptions.

## Open Questions
- Minimum cohort threshold and rules for school/youth team statistics.
- Private-vault storage, retention, deletion, and reauthentication policy.
- Member/community identity, moderation, and retention policy.
- Public record-search quota and distributed scraping defense level.

## Scope Boundaries
- INCLUDE: implementation-ready UX reliability, error recovery, local-data safety, accessibility, verification, and handoff.
- EXCLUDE: new public interaction surfaces, automatic identity resolution, private uploads, account-linked athlete records, and unsanctioned team-detail expansion.

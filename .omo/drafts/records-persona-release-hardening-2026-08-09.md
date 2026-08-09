# Draft: Records Persona Release Hardening

## Requirements (confirmed)
- Run a broad, persona-led planning pass before the next release.
- Improve the public record lookup experience without weakening identity, minor, or privacy boundaries.
- Continue safe and reversible work without waiting for routine approval.
- Leave high-impact public-policy decisions for the owner.

## Technical Decisions
- Treat the existing public-record index as browse-only. Same-name candidates remain separate and are never auto-merged.
- Treat team pages as public aggregate results only. No individual record detail or roster flow is added.
- Treat browser collections as device-local convenience state, not account ownership or private storage.
- Plan changes in small releaseable waves, each with a focused browser and contract check.

## Research Findings
- 18 persona and architecture reviews were collected across guest students, logged-in students, runners, guardians, coaches, school staff, operators, accessibility, adversarial/privacy, and test-architecture perspectives.
- The active branch already fixed canonical athlete sharing, candidate return context, the active mobile-dock conflict, candidate keyboard focus, and minimum-data request guidance. Older reviews that report the pre-fix behavior are not implementation facts.
- The remaining high-confidence safe work is clearer first-use routing, candidate-selection comprehension, active-scope explanation, device-local lifecycle clarity, and reproducible mobile/loading QA.
- Small-team suppression, minor-share redaction, private note/photo storage, identity ownership, and community identity are policy gates rather than ordinary UI tasks.

## Open Questions
- Owner gate G1: choose a public suppression/bucketing policy for team groups with fewer than five unique athletes.
- Owner gate G2: choose the default detail level for public share cards involving likely minors.
- Owner gate G3: decide whether an authenticated account may ever persist a personal record collection across devices.
- Owner gate G4: approve a private-storage design before any notes or photos exist beyond the current device.

## Scope Boundaries
- INCLUDE: copy, information hierarchy, keyboard/touch/loading behavior, route recovery, public team scope clarity, browser-only storage clarity, tests, and evidence.
- EXCLUDE: automatic identity merge, team roster/detail exposure, private uploads, private memos, small-group disclosure rules, account claims, chat expansion, and raw-data collection changes.

# Persona-Led Records Next Safe Wave

## TL;DR
> **Summary**: Keep record discovery quick and truthful for students and coaches, while making failure recovery visible and holding privacy-sensitive team and private-space work behind owner decisions.
> **Deliverables**: Partial-compare recovery, compare-screen touch consistency, minimum-data request guidance, malformed-link coverage, and a team/privacy decision ledger.
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: P1 partial compare -> P4 mobile/browser verification

## Context

### Evidence already accepted

- Same-name candidates remain separate. The compare chart now uses `athleteKey` internally while keeping display names readable.
- A stale comparison link with two unavailable profiles shows a recovery panel and returns to `/records` in one tap.
- Device-local storage fallback, record-search retry, mobile drawer focus, and aggregate-only team DTO boundaries already have browser or contract coverage.
- Public uploads are not a permitted storage path for private notes or photos.

### Persona findings applied

| Persona | Need | Response in this plan |
| --- | --- | --- |
| Middle and high-school athlete | One clear next step; no long legal explanation | Keep lookup and recovery actions singular and brief. |
| University or professional athlete | Same-name people must never be merged | Retain separate profile requests and surface partial failures. |
| Coach | Correct a record without exposing unnecessary information | Put minimum-data guidance at the correction boundary. |
| Team captain | A season snapshot, not a disguised athlete list | Keep public team work aggregate-only and decision-gated for small groups. |
| Guardian | No silent local-data loss | Preserve visible volatile-storage status. |
| Keyboard and mobile user | Clear focus and at least 44px actions | Finish compare-view action coverage at 375px. |

## Guardrails

- Never auto-merge or imply verified ownership for matching names.
- Never put names, athlete keys, raw result rows, affiliations, local workspaces, notes, attachments, or source IDs in a public team response.
- Never use public Cloudinary uploads for personal notes or photos.
- Do not add a player list, `best athlete`, or small-group team breakdown before the owner decisions below.
- Do not treat a 404 or transport error as proof that a record does not exist.

## Owner Decisions Held

| ID | Decision needed | Default until decided |
| --- | --- | --- |
| D1 | Small-group protection: threshold and hide versus redact behavior | No granular team distribution or player-facing statistic. |
| D2 | Whether a public team can show an exact athlete count | Use defined aggregate measures only; do not call a count a roster. |
| D3 | Correction, hiding, deletion, and objection retention/SLA | Existing request flow only; no new deletion automation. |
| D4 | Account-bound private notes and photos | No implementation; existing upload route remains public-only. |
| D5 | Verified-member chat and migration from anonymous sessions | No implementation or new chat entry point. |

## Execution Strategy

### Wave 1: Safe, reversible UX work

1. **Partial comparison recovery**
   - If two or more profiles load but one or more requested profiles fail, show a neutral inline notice: only the profiles that loaded are shown.
   - Keep the successful profiles separate and do not show a failed key, hidden profile, or inferred identity.
   - Test: real Chrome at 375px with three query keys, one mocked 404, two valid profiles; no unexpected console/page errors.

2. **Compare action touch and focus completion**
   - Apply the existing `min-h-11` and `focus-visible` pattern to player chips and event switches inside the comparison screen.
   - Test: browser checks every visible comparison action is at least 44px high and has focus-visible styling.

3. **Minimum-data correction guidance**
   - Make correction the first valid request intent and place a short warning before free text: do not enter resident numbers, birth dates, account credentials, or unnecessary contact details.
   - Keep contact optional and preserve the existing ticket lookup flow.
   - Test: component and browser test assert the guidance, correction default, and no new required sensitive field.

### Wave 2: Recovery and release evidence

4. **Malformed and stale record-link matrix**
   - Add browser cases for an invalid athlete key, one missing comparison profile, two missing comparison profiles, unsupported request intent, and blocked local storage.
   - Every case must end on a useful page with one truthful recovery action, no blank surface, and no unsuppressed page error.

5. **Persona release report refresh**
   - Update `docs/athletetime-persona-release-matrix.md` only with scenarios proven in the browser.
   - Record D1-D5 as deferred, rather than treating them as feature backlog items that are safe to build.

## Acceptance Criteria

- `node --test backend/tests/records-flow-e2e.test.js backend/tests/records-mobile-dock-e2e.test.js` passes.
- `npm.cmd --prefix frontend run type-check` and `npm.cmd --prefix frontend run build:check` pass.
- All changed action surfaces are below the 250 pure-LOC limit and have no `any`, type assertion, or suppressed error.
- New browser tests run at 375px with zero unexpected console or page errors.
- Public team contracts continue to recursively exclude `name`, `athleteKey`, `records`, `affiliations`, `workspace`, `note`, `attachment`, and `sourceId`.

## Explicitly Out of Scope

- Implementing any D1-D5 decision.
- Team player directories, automated medal or record-improvement claims, and individual team rankings.
- Private note/photo storage, verified identity claims, membership-based chat, or automatic data-rights action.

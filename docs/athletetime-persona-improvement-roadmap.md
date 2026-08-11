# AthleteTime Persona Improvement Roadmap

Status: active planning baseline

## Purpose

AthleteTime should help a visitor find collected public athletics records without
turning an ambiguous name, a small team, or a browser-local selection into a
claim about a person. This roadmap consolidates 36 persona reviews across
students, athletes, coaches, guardians, operators, accessibility users, and
adversarial users.

The product sequence is:

```text
find a public record -> choose a candidate -> inspect a clear collection ->
return for a competition or record context -> optionally share a link
```

The service does not need more public surfaces before this loop is clear and
safe.

## What Is Already Working

- Name matches are shown as separate candidates rather than automatically
  merged people.
- Record collections are device-local and disclose that they are not account
  verification.
- Team pages are aggregate-only and do not return individual names, athlete
  keys, raw records, source identifiers, notes, or attachments.
- Public record recovery, same-name selection, mobile comparison controls, and
  calculator input validation have browser and contract coverage.
- Unfinished community, marketplace, and contribution surfaces have a clear
  preparation state.

## Immediate Safety Baseline

The public chat must remain unavailable until its redesign is complete. The old
implementation accepted browser-provided identity and reporting keys, which can
be forged to hide a message. The public route, API, and websocket must all
return the preparation state together.

Registration must always send an existing member to the canonical `/login`
page. Browser history is not a reliable login destination.

## Ordered Work

### P0: Keep false promises and unsafe public paths closed

1. Keep the chat route, `/api/chat/*`, and `/ws/chat` closed together.
2. Keep the chat websocket origin out of the production CSP and build settings.
3. Do not say a comparison has started unless the next selection consumes the
   stored first subject and reaches a real comparison view.
4. Do not enable row-level correction, hiding, or deletion until the request
   path preserves a narrow source record identifier end-to-end.

Completion evidence:

- Direct HTTP and websocket requests receive a non-cacheable unavailable
  response.
- A completed record comparison has two to four user-selected subjects, or the
  UI truthfully offers only `다른 선수 찾기`.
- Two same-name/source tuples can prove that correcting one record cannot hide
  another record.

### P1: Make the record journey feel complete

1. After a visitor confirms multiple candidates, open one `기록 모음 상세`
   page rather than the first candidate's detail page.
2. Preserve every chosen candidate in that page without merging identities.
3. Show the selection scope in the title, then use tabs for records,
   affiliations, and sources.
4. Keep comparison separate from collection: the visitor explicitly selects up
   to four candidates, sees the selected count, and can remove one before
   opening comparison.
5. Add a `같은 이름 후보로 돌아가기` action from a detail page. It must not
   imply that a school-change candidate is the same person.

Completion evidence:

- Selecting three candidates with 25 records keeps all 25 records after page
  navigation, back navigation, reload, and a device-storage failure.
- Same-name candidates stay separate in URL, UI, API, and compare state.
- At 375px, the next action is reachable without a persistent overlapping
  control.

### P1: Make first use and recovery honest

1. Keep the home surface to three visible actions: record search, upcoming
   competition, and continue a device-local collection when present.
2. Move repeated explanations below the primary action or behind one short
   disclosure.
3. Give password recovery a stable URL state such as `/login?mode=reset`, with
   refresh, close, and back behavior covered by a browser test.
4. Replace a lazy-route-only loading message with an error boundary that offers
   retry, records, and home actions.
5. For slow PaceRise data, show an honest wait message, a safe records link,
   and a retry state after a bounded delay.

Completion evidence:

- Broken imports, failed route data, and failed search requests each leave one
  visible recovery action.
- A nonmember can move from registration to login and password recovery without
  relying on history or hidden browser state.

### P1: Truthful local training log behavior

1. Return storage success or failure instead of swallowing localStorage errors.
2. Validate each saved log entry, quarantine malformed entries, and cap text
   and entry counts.
3. When storage is unavailable, never show a saved-success message. Offer a
   short explanation and an explicit clear action for shared devices.
4. Keep training-log data separate from private notes, accounts, uploads, and
   analytics.

Completion evidence:

- Quota failure, disabled storage, invalid JSON, and a partially malformed
  array each leave the calculator usable and do not claim successful storage.

### P2: Accessibility and navigation polish

1. Add a skip link and make each route contain one main landmark.
2. Give the header's `더보기` control disclosure semantics or use the installed
   dialog/menu primitive with Escape and focus restoration.
3. Use an accessible dialog primitive for future login or account recovery
   dialogs before making those routes modal again.
4. Give icon-only controls an accessible name.

Completion evidence:

- Keyboard users can skip navigation, open and close menus, and recover focus
  at a 360px viewport.
- Screen-reader landmarks have no nested main region.

## Decisions That Must Be Made Before Implementation

| Gate | Why code must wait | Required owner decision |
| --- | --- | --- |
| Team small-group suppression | A season/event/division slice can identify a young athlete. | Minimum group size, whether school teams need a higher floor, and whether athlete counts are hidden or bucketed. |
| Team metric wording | A count can look like an official roster, medal table, or PB claim. | Public wording for participant count and record improvement. |
| Row-level data rights | Broad tuple suppression can affect multiple preliminary/final rows. | Record/source identifier contract, request evidence, review and retention policy. |
| Private notes and photos | The existing upload endpoint returns public Cloudinary URLs. | Account-bound private storage, signed access, deletion/retention, and cross-account tests. |
| Chat redesign | A chat identity cannot come from browser-provided IDs. | Server-issued session, origin/rate/payload limits, moderation policy, report threshold, and retention. |
| Automated editorial content | Automatic collection or writing can overstate data confidence. | Human approval, source receipt, correction path, and seasonal publication cadence. |

## Editorial and Community Direction

Use a competition-cycle magazine, not a daily news feed:

- Before a competition: `대회 보기 전 3가지`
- After a competition: `결과를 읽는 법`
- Between events: `기록 한 장`
- In off-season: `이번 달 트랙 노트`

The first release is read-only. Every article needs a publication date, last
check date, original source link or filename, collected-public-record scope,
and a correction route. Do not use public copy that claims AI verified,
predicted, or evaluated an athlete.

## Non-Negotiable Guards

- No automatic same-name, school-change, or person-number merge.
- No team roster, individual highlight, private note, attachment, or source ID
  on a public team surface.
- No public upload route for private material.
- No production data-rights migration before a disposable PostgreSQL test proves
  recovery from the already-recorded migration-007 state.
- No automatic external-result publication from a request or a search result.

## Review Cadence

Before each public release, run one browser pass for a nonmember, a student
athlete, a guardian, a team operator, a keyboard user, and a hostile requester.
Each pass records the exact route, expected action, actual action, console
errors, and any personal-data boundary crossed. A feature with a missing owner
decision remains in preparation mode rather than receiving a cosmetic public
button.

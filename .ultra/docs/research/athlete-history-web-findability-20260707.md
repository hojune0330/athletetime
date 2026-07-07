# Athlete History Web Findability Check

Date: 2026-07-07

## Scope

Check whether Fable, Opus, or another reviewer/operator can find the necessary public evidence on the web, and define a safe method for ranking/watchlist athlete history review.

## Finding 1: KAAF athlete history is findable, but must stay manual

Source checked:

- `https://www.kaaf.or.kr/ver3/run/player.asp`

Observed:

- The KAAF page exposes a "선수이력 조회" surface.
- It includes filters such as athlete name, athlete type, category, and event.
- The rendered page can include athlete profile context and rows with date, competition, event, place, record, wind, and note fields.

Decision:

- This is suitable for owner/operator manual review.
- This is not suitable for bulk automated ingestion.
- Athlete name, birth data, institution identifiers, and raw athlete-history text must not be stored.

## Finding 2: KAAF domestic/international schedule pages are useful for official attachments

Sources checked:

- `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2026`
- `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2026`

Observed:

- Domestic schedule pages list annual competitions by track/field, road race, single-event, and federation/operator categories.
- International schedule pages list overseas/international events, including open championships such as Taiwan Open when present in the KAAF schedule.
- These pages are better primary collection targets than athlete-history pages when result attachments exist.

Decision:

- Continue using KAAF schedule/result attachments as the first source tier.
- Use athlete-history only to discover missing overseas competitions that do not appear in our KAAF attachment flow.

## Finding 3: Overseas confirmation is possible through official or near-official result surfaces

Sources checked:

- `https://worldathletics.org/competition/calendar-results`
- `https://worldathletics.org/stats-zone`

Useful query set:

- `World Athletics HOKUREN Distance Challenge results`
- `JAAF Distance Challenge results`
- `HOKUREN Distance Challenge results`
- `World Athletics EDION Distance Challenge in Osaka results`
- `JAAF Osaka Open athletics results`
- `大阪オープン 陸上 結果`
- `Taiwan Open Athletics results`
- `Chinese Taipei Athletics Open results`
- `World Athletics Taiwan Open results`

Decision:

- The extractor query set should include event-name variants, not only the Korean name copied from athlete history.
- World Athletics/JAAF/Taiwan federation/host result pages are confirmation sources.
- Athlete-history-only facts remain internal hints.

## Proposed ranking/watchlist workflow

1. Owner/operator maintains the ranking/watchlist manually.
2. Watchlist entries are minimal: athlete display name, event, category, reason, last checked date, operator, status.
3. Operator manually checks KAAF athlete history for missing overseas competitions.
4. Operator copies only the necessary event line into a temporary local file.
5. `tools/extract-athlete-history-evidence.js` extracts sanitized hints.
6. Hints are confirmed against World Athletics, JAAF, Taiwan federation, official PDFs, or host result pages.
7. Only confirmed facts are entered into normalized AthleteTime records.
8. Same-name ambiguity blocks profile merge.
9. Raw athlete-history text and restricted identifiers are deleted/not committed.

## Reviewer checklist

- Can the reviewer reproduce the source discovery with the listed URLs and queries?
- Does the PR avoid implying an official ranking?
- Does the PR avoid automated athlete-history scraping?
- Does the tool output avoid raw identifiers?
- Does each publishable record require external confirmation?

## Status

- PR #24 is reviewable.
- The PR body still has an older full-test count in the initial description, but the PR conversation contains the updated post-rebase result: `npm test` 188/188 pass.
- GitHub metadata reported `mergeable: false` at one point, but local `origin/main...HEAD` showed `0 2` and merge-tree produced no conflict output. Treat this as a GitHub mergeability cache/branch-rule signal unless GitHub UI says otherwise.

# Athlete History Web Findability Check

Date: 2026-07-07

## Scope

Check whether Fable, Opus, or another reviewer/operator can find the necessary public evidence on the web, and define a safe method for ranking/watchlist athlete history review.

## Finding 1: KAAF athlete history is findable, but must stay manual

Source checked:

- `https://www.kaaf.or.kr/ver3/run/player.asp`
- `https://result.kaaf.or.kr/history/playerHistory.do`
- `https://result.kaaf.or.kr/robots.txt`

Observed:

- `kaaf.or.kr/ver3/run/player.asp` is a public hub page that links to the actual result-history service.
- The actual athlete-history search page is `result.kaaf.or.kr/history/playerHistory.do`.
- `result.kaaf.or.kr/robots.txt` returns `User-agent:* Disallow:/`.
- The athlete-history form posts these fields:
  - `pageIndex`
  - `gubun` (`E` elite, `M` masters)
  - `kor_nm`
  - `status` (`A` active, `R` retired, empty all)
  - `kind_cd`
  - `detail_class_cd`
  - `searchKey=S`
- The search result list exposes these columns:
  - number
  - athlete name
  - registration year
  - birth year
  - team
  - athlete status
  - event
- The detail modal calls `/history/popHistoryPlayer.do` with `person_no`.

Decision:

- This is suitable for owner/operator manual review.
- This is not suitable for bulk automated ingestion.
- `person_no`, birth data, institution identifiers, and raw athlete-history text must not be stored.
- The operator may only copy a necessary competition line into a temporary local file, then delete it after extracting sanitized hints.

## Finding 1A: KAAF TOP record query can seed the operator watchlist

Sources checked:

- `https://www.kaaf.or.kr/ver3/info/top.asp`
- `https://result.kaaf.or.kr/recInfo/topRecList.do`

Observed:

- `kaaf.or.kr/ver3/info/top.asp` exposes the public TOP record search surface.
- `result.kaaf.or.kr/recInfo/topRecList.do` is the actual interactive app.
- The app internally calls `/recInfo/searchTopRecList.do`.
- Query parameters observed:
  - `start_dt` (`YYYYMMDD`)
  - `end_dt` (`YYYYMMDD`)
  - `check_dt` (`Y` all-period, `N` bounded)
  - `check_round` (`Y` include heats/semis, `N` finals only)
  - `check_ref` (`Y` include reference records, `N` exclude)
  - `gubun` (`E` elite, `M` masters)
  - `kind_cd`
  - `detail_class_cd`
  - `rank_cnt`
- Result fields observed in page script:
  - `FINAL_RANK`
  - `GREC_FORMAT`
  - `GTOOL`
  - `GWIND_FORMAT`
  - `GDATE`
  - `KOR_NM`
  - `TEAM_NM`
  - `TO_NM`
  - `GBIGO_NM`
  - `GROUND_NM`
  - `ENG_NM`
  - `TO_ENM`

Decision:

- TOP record search is a good manual seed for the `operator watchlist`.
- Because it is served by `result.kaaf.or.kr`, it must not become an automated bulk ingestion path.
- User-facing copy must not call this an AthleteTime official ranking.

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
- Detail pages follow `https://www.kaaf.or.kr/ver3/info/view.asp?SEQ={seq}&WPAGE=1&YEAR={year}`.
- Result attachments commonly live under `https://www.kaaf.or.kr/DATA/schedule/{year}/{month}/FILEs_4/{filename}`.
- Generic filenames must inherit competition context from the schedule row.

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

1. Owner/operator manually checks KAAF TOP records for the relevant event/category/time window.
2. Operator creates or updates a minimal `operator watchlist` entry.
3. Operator first checks KAAF domestic/international schedule attachments for the competition result file.
4. If no result file exists, operator manually checks KAAF athlete history for the watched athlete.
5. Operator copies only the necessary missing-competition line into a temporary local file.
6. `tools/extract-athlete-history-evidence.js` extracts sanitized hints.
7. Hints remain `needs_external_confirmation`.
8. Operator confirms against World Athletics, JAAF, Taiwan federation, official PDFs, or host result pages.
9. Only confirmed facts are entered into normalized AthleteTime records.
10. Same-name ambiguity blocks profile merge.
11. Raw athlete-history text and restricted identifiers are deleted/not committed.

## Code tables observed

Useful `kind_cd` values:

- `12`: male middle school
- `13`: male high school
- `15`: male open/general
- `22`: female middle school
- `23`: female high school
- `25`: female open/general
- `3X`: U18
- `3Y`: U20

Useful `detail_class_cd` values:

- `11`: 100m
- `12`: 200m
- `13`: 400m
- `14`: 800m
- `16`: 1500m
- `17`: 3000m
- `18`: 5000m
- `19`: 10000m
- `1B`: 3000mSC
- `1K`: 10km
- `61`: half marathon
- `62`: marathon

## Single-case proof: missing from KAAF schedule, present in official external results

Goal:

- Find exactly one example of an overseas performance that is not visible in KAAF domestic/international schedule pages, but can be confirmed from an external official result surface.
- Verify that the user's proposed path works: KAAF TOP record query -> athlete-history lookup -> external official confirmation.

Date checked:

- 2026-07-07

Case:

- Competition: `HOKUREN Distance Challenge 2025 in ABASHIRI`
- Official external source: World Athletics Calendar & Results
- Example result observed in search result snippet:
  - `19 JUL 2025`
  - Men 800m Final 1
  - `Jae-ung LEE` (KOR)
  - `1:46.51`
  - place `2`

KAAF schedule absence check:

- Checked `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2025`
- Checked `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2025`
- Checked `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2026`
- Checked `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2026`
- Searched these terms in fetched HTML:
  - `HOKUREN`
  - `Hokuren`
  - `호쿠렌`
  - `디스턴스`
  - `Distance Challenge`
  - `ABASHIRI`
  - `Abashiri`
  - `아바시리`
- Hits: none.

Operational interpretation:

- This is the kind of record KAAF attachment collection can miss.
- If the operator sees this performance in athlete history, the athlete-history line is only a discovery hint.
- World Athletics is the confirmation source for publication.
- Do not store `person_no` or raw athlete-history text.

Manual TOP-record check performed:

- Page: `https://result.kaaf.or.kr/recInfo/topRecList.do`
- Internal endpoint called once, as a manual-equivalent test: `/recInfo/searchTopRecList.do`
- Request body:
  - `start_dt=20250101`
  - `end_dt=20251231`
  - `check_dt=N`
  - `check_round=Y`
  - `check_ref=N`
  - `gubun=E`
  - `kind_cd=15`
  - `detail_class_cd=14`
  - `rank_cnt=5`
- Result row observed:
  - `TO_NM=2025 디스턴스첼린지대회(5차)`
  - `GDATE=2025-07-19`
  - `KOR_NM=이재웅`
  - `TEAM_NM=국군체육부대`
  - `DETAIL_CLASS_NM=800m`
  - `GREC_FORMAT=1:46.51`
  - `GROUND_NM=결승`
- Restricted-field warning:
  - the JSON response also contains `PERSON_NO1`; this must be dropped before any storage/log/report.

Manual athlete-history check performed:

- Page: `https://result.kaaf.or.kr/history/playerHistory.do`
- Query:
  - `gubun=E`
  - `kor_nm=이재웅`
  - no category/event narrowing
- Result:
  - four same-name candidates appeared.
  - the relevant candidate was distinguishable by `국군체육부대`, registration year `(2026)`, and professional athlete status.
- Detail modal:
  - `/history/popHistoryPlayer.do`
  - requires `person_no`; used in memory only and not printed/stored.
- Matching competition line observed:
  - `2025.07.19 | 2025 디스턴스첼린지대회(5차) | 800m | 결승 2 | 1:46.51`

Practical conclusion:

- The workflow works.
- The safe version is:
  1. manually seed candidate from TOP records,
  2. manually confirm same athlete in athlete-history,
  3. strip restricted identifiers,
  4. confirm externally through World Athletics/JAAF/etc.,
  5. store only normalized result + source provenance.

Operator handoff command:

```text
Run one manual missing-result verification.
Start from KAAF schedule attachments. If no attachment covers the suspected record, use KAAF TOP records to seed a candidate, then use athlete-history lookup to confirm the candidate line. Do not automate bulk queries. Do not store person_no, birth data, raw athlete-history HTML, or any restricted identifier. Confirm the candidate against World Athletics/JAAF/Taiwan federation/official PDF before marking it publishable. Report the query conditions, sanitized result line, external confirmation source, and final decision.
```

Completion report fields:

- operator
- date
- target event/category
- KAAF schedule attachment status
- TOP-record query parameters
- sanitized TOP-record candidate
- athlete-history same-name count
- sanitized athlete-history result line
- external confirmation URL/file
- restricted fields not stored
- decision: `publishable`, `held`, or `discarded`

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

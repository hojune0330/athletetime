# Track A XLSX Service Promotion Evidence

## Scope
- Promoted only the approved Track A horizontal XLSX slice.
- Source candidate rows: 4,292.
- Promoted rows: 3,563.
- Promoted workbooks: 9.
- Held workbook: 1 (`2016 전국대구실내육상경기대회`, 729 rows, unsafe event/header pollution).
- Years: 2015, 2016, 2017.
- Deferred: 83 legacy `.xls` files remain unpromoted.
- Candidate ledgers and raw originals were not changed.

## Counts
- 2015: 4 competitions, 1,009 result rows.
- 2016: 3 competitions, 1,661 result rows.
- 2017: 2 competitions, 893 result rows.
- Total: 9 competitions, 508 events, 3,563 result rows.

## Manual TOP100 Dedup Delta
- `manualTopRecordStats.skippedDuplicates` delta: 0.
- Reason: the promoted Track A XLSX rows do not overlap the current indexable TOP100 candidate dedupe keys. Example: promoted `2015 예천 김국영 10.45` is not present in the TOP100 candidate batch; current TOP100 Kim Kukyoung duplicate is `2017 코리아오픈 10.07`.
- Evidence: `.omo/evidence/track-a-xlsx-service-promotion/manual-top-delta.json`.

## Verification
- RED proof: `.omo/evidence/track-a-xlsx-service-promotion/red.tap` and `red-service-surface.tap`.
- GREEN targeted proof: `.omo/evidence/track-a-xlsx-service-promotion/final-targeted-tests.tap` (`19/19 pass`).
- Full suite: `npm-test.tap` (`219/219 pass`).
- Frontend build/typecheck: `frontend-build-check.log`.
- Data safety scan: `data-safety-scan.json` (forbidden hits: none).
- HTTP QA: `.omo/evidence/track-a-xlsx-service-promotion/http-qa-final/http-transcript.txt` and `http-assertions.json`.
- Cleanup receipt: `.omo/evidence/track-a-xlsx-service-promotion/http-qa-final/cleanup.txt`.

## User/Fable Follow-up
The user clarified that 2005+ expansion should not be unnecessarily delayed after this safe slice. This PR therefore completes the safe part of the approved 2015-2017 XLSX promotion and leaves the next step as immediate 2005-2014 / `.xls` converter-track expansion plus review of the held 2016 indoor workbook, not an indefinite pause.

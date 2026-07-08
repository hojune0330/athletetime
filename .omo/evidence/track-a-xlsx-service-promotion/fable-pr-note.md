## Codex Track A follow-up for Fable review

User clarification: the user accepts the safe-first ordering, but does not want 2005+ expansion delayed after the approved preparation work. This PR therefore promotes the safe 2015-2017 XLSX slice now and frames the next Track A work as immediate continuation, not a pause.

### What changed
- Added a deterministic Track A promotion command:
  - `npm run data:check:track-a-xlsx`
  - `npm run data:promote:track-a-xlsx`
- Promoted safe public service data:
  - `data/results/2015.json`: 4 competitions, 1,009 rows
  - `data/results/2016.json`: 3 competitions, 1,661 rows
  - `data/results/2017.json`: 2 competitions, 893 rows
  - total: 9 competitions, 508 events, 3,563 public rows
- Held one workbook instead of forcing it into service:
  - `2016 전국대구실내육상경기대회`, 729 candidate rows
  - reason: `UNSAFE_EVENT_LABELS` (`60m 4`, `성명/소속/기록` header pollution, etc.)
- Updated records-page coverage copy to say partial `2015-2017` plus 2018+ first, with 2005+ still being strengthened.

### Guardrails preserved
- 83 `.xls` files remain deferred.
- No raw originals committed.
- No `candidate-records.jsonl` changes.
- No `privateStoragePath`, source storage path, `PERSON_NO`, birthdate/contact/address tokens in public result JSON.
- No full 2005-present coverage claim.

### Evidence
- RED: `.omo/evidence/track-a-xlsx-service-promotion/red.tap`, `red-service-surface.tap`, `red-unsafe-indoor-hold.tap`
- GREEN targeted: `.omo/evidence/track-a-xlsx-service-promotion/final-targeted-tests.tap` (`19/19 pass`)
- Full suite: `.omo/evidence/track-a-xlsx-service-promotion/npm-test.tap` (`219/219 pass`)
- Frontend: `.omo/evidence/track-a-xlsx-service-promotion/frontend-build-check.log`
- HTTP QA: `.omo/evidence/track-a-xlsx-service-promotion/http-qa-final/http-assertions.json`
- Data safety: `.omo/evidence/track-a-xlsx-service-promotion/data-safety-scan.json`
- Summary: `.omo/evidence/track-a-xlsx-service-promotion/summary.md`

### Next work requested by user
Proceed directly after this PR with 2005-2014 / `.xls` converter-track expansion and a separate review path for the held 2016 indoor workbook. The user is explicitly saying: do not treat this safe-first slice as a reason to slow the broader 2005+ buildout.

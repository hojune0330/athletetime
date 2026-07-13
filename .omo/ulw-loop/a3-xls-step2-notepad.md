# A-3 XLS Step 2 Notepad

## Brief
User asked to take Fable instructions and proceed fully. Fable/Claude PR #43 instructions:
- Use only 45 `promotable=true` workbooks as Step 2 candidates.
- Keep 38 blocked workbooks excluded from candidate parsing.
- Do not create held-candidate stubs for vertical group; keep blocked 38 as evidence JSON only.
- Reflect post-audit finding: allow sheet-level promotable horizontal sheets inside mixed blocked workbooks as `partially_promoted` if tests and PR body explain it.
- Respect divisionHierarchyService, stop/question if unspecified >20%, keep TOP100 dedup 7,321 invariant, report delta.

## Skills Survey
- omo:ulw-loop: required by user; evidence-bound execution and manual QA.
- omo:programming: JS/Node service and tests touched.
- github:github / github:yeet capability: needed for PR comments/status and final PR.
- spreadsheets: indirectly relevant to XLS, already handled by existing SheetJS code; no spreadsheet authoring needed.

## Surfaces / Scope Size
- Data CLI/report surface: `.xls` dry-run and new Step 2 candidate dry-run.
- Services: layout classifier, converter report, candidate extraction/promotion helpers.
- Tests: new/updated backend node tests.
- Evidence/PR: JSON/MD reports, mutation/security scans, GitHub PR.

## Success Criteria Draft
1. Happy path: Step 2 dry-run parses only promotable sheet/workbook set into normalized candidate JSONL and reports counts/delta without touching `data/results`.
2. Edge/adversarial: blocked 38 workbooks produce blocked-workbooks evidence JSON only; no vertical held-candidate stubs and no sensitive/private marker leakage.
3. Regression: division hierarchy normalization is used; unspecified ratio <=20%, TOP100 dedup skip count 7,321 unchanged, existing Track A/service tests remain green.
4. Manual QA channel: CLI/tmux transcript or direct CLI artifacts invoking the operator command against real local originals.

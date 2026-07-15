# A-3 Legacy XLS Step 2 Candidate Dry Run

- Years: 2015, 2016, 2017
- Attempted XLS files: 83
- 45 promotable workbooks boundary: 45
- 38 blocked workbooks boundary: 38
- Partially promoted workbooks: 3
- Candidate rows: 21865
- Service data mutated: no
- Private paths excluded: yes
- TOP100 skipped duplicates invariant: 7,321
- Division unspecified ratio: 14.91%

## Candidate Workbooks By Status

  - fully_promotable: 45
  - partially_promoted: 3

## Block Reasons

  - MIXED_RESULT_LAYOUTS_NEED_REVIEW: 3
  - VERTICAL_RESULT_LIST_NEEDS_PARSER: 35

## Rule

- Parse only horizontal podium sheets.
- Keep vertical and mixed residual sheets in blocked-workbooks evidence.
- Allow partially promoted horizontal sheets only when blocked residual sheets stay blocked.
- Do not create held-candidate stubs for blocked sheets.

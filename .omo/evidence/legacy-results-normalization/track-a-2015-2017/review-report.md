# Track A Legacy Result Normalization Evidence

- Years: 2015, 2016, 2017
- Spreadsheet files: 103
- XLSX inspect candidates: 19
- Legacy XLS waiting for converter: 83
- Non-elite files excluded from service candidate flow: 1
- Horizontal podium workbooks detected: 10
- Candidate result rows extracted: 4292
- Raw originals tracked by git: 0

## Candidate Rows By Year

- 2015: 1009 candidate rows
- 2016: 2390 candidate rows
- 2017: 893 candidate rows

## Operator Notes

- This command writes normalized candidates only. It does not mutate `data/results/*.json`.
- `.xls` files remain blocked until a safe converter step is added.
- 생활체육/마스터즈-like files are separated from the elite service candidate path.
- Candidate rows keep source filename and private storage path so Fable can spot-check before promotion.

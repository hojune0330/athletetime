# A-3 Step 2 Manual QA Note

- tmux availability: not available in this Windows Git Bash environment (`command -v tmux` exit 1).
- Manual CLI execution used instead: `node tools/normalize-legacy-xls-candidates-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/a3-xls-step2-candidate-dry-run --json`.
- Transcript: `.omo/evidence/a3-xls-step2/cli-json-final.txt`.
- Output files: `step2-report.json`, `blocked-workbooks.json`, `normalized-candidates.sample.jsonl`.
- Full local candidate dump is generated but gitignored: `normalized-candidates.jsonl`.

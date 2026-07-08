# KAAF TOP100 Manual Batch Review

- Batch: 20260708-kaaf-top100
- Source: https://result.kaaf.or.kr/recInfo/topRecList.do
- API endpoint observed: searchTopRecList.do
- Candidate records: 24630
- Search-indexable candidates: 16885
- Held candidates: 7745
- Review status:
  - source_verified: 23861
  - needs_external_confirmation: 769
- Year range: 2005 - 2026
- Sensitive source fields stripped by collector: 854/854 source calls
- Restricted identifiers in output: none expected

## Operating rule

This batch is a public TOP-record candidate batch, not a full competition-result dump.
Domestic KAAF TOP100 rows are marked source_verified because KAAF is the first public source.
Overseas or foreign-hosted hint rows stay marked needs_external_confirmation until an operator confirms the external result.
Team/relay/road-relay rows are retained in the batch but excluded from athlete-name search.
Analytics indexing dedups TOP100 against existing data/results rows; data/results rows win.

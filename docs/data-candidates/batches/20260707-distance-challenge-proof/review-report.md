# Missing Result Candidate Batch

Date: 2026-07-07
Operator: codex-manual-proof
Batch: 20260707-distance-challenge-proof

## Scope

Prove one manual workflow for finding a record that may be absent from KAAF schedule attachments but visible through KAAF TOP records and athlete-history lookup.

## Sources Checked

- `https://result.kaaf.or.kr/recInfo/topRecList.do`
- `https://result.kaaf.or.kr/history/playerHistory.do`
- `https://result.kaaf.or.kr/history/popHistoryPlayer.do`
- `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2025`
- `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2025`
- `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2026`
- `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2026`
- World Athletics Calendar & Results search target: `HOKUREN Distance Challenge 2025 in ABASHIRI`

## Candidates

| Candidate | Status | Summary |
| --- | --- | --- |
| `MRC-20260707-0001` | `needs_external_confirmation` | 2025-07-19, 2025 디스턴스첼린지대회(5차), 이재웅, 800m, 결승 2, 1:46.51 |

## Restricted Fields Dropped

- `PERSON_NO1`
- `person_no`
- `birthYear`
- raw athlete-history HTML
- cookies/session IDs

## External Confirmation

Pending. Reviewer should confirm against World Athletics, JAAF, or another official result URL/file before changing the candidate status to `confirmed`.

## Decisions

- Keep candidate as `needs_external_confirmation`.
- Do not publish yet.
- Use as proof that the manual workflow is feasible.

## Reviewer Notes

- Same-name candidates existed in athlete-history lookup, so name-only matching is unsafe.
- KAAF TOP record JSON includes restricted identifiers; never store raw response.

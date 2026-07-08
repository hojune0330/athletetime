# Manual Athlete-History Update Policy

Created: 2026-07-07

## Core decision

AthleteTime will not bulk-scrape or automatically refresh athlete-history pages.

For missing overseas competitions such as Japan Distance Challenge, Osaka Open, and Taiwan Open, athlete-history pages may be used only as a manual discovery hint. Any ranking-related or high-value record update is maintained directly by the owner or an assigned operator.

This is a deliberate operating model:

- Ranking/watchlist updates are human-maintained, not crawler-maintained.
- Athlete-history text is not treated as an automatic source of truth.
- A hint is not published until an external official result or a submitted proof package confirms it.

## Why this exists

Some overseas competitions are not managed as KAAF domestic schedule/result attachments. Athletes may have those performances listed in athlete-history views because they requested result registration later.

The right product behavior is not "collect every athlete history page." The right behavior is:

1. Prioritize high-value athletes or user-submitted cases.
2. Use athlete-history content only to discover a missing competition.
3. Confirm the competition against an independent official result.
4. Enter the normalized result with source evidence and uncertainty notes.

## Operating scope

| Case | Handling | Reason |
| --- | --- | --- |
| Owner/operator watchlist | Manual review | High user demand, controlled scope |
| Self-submitted athlete/coach request | Case-by-case manual review | Lower identity-mismatch risk |
| All athletes in bulk | Do not automate | High privacy, mismatch, and over-collection risk |

Internal term: `operator watchlist`.

Public copy must not say "top 10 ranking" or imply an official ranking. If user-facing copy is needed, use "records we are checking by request or operator review."

## Manual update flow

1. The owner or assigned operator checks an athlete-history page for a missing overseas competition.
2. Do not save the athlete name, birth data, institutional identifier, or raw athlete-history text.
3. Copy only the necessary competition line into a temporary local input file.
4. Run `tools/extract-athlete-history-evidence.js` to produce sanitized hints.
5. Confirm the hint against an external official source such as World Athletics, JAAF, the Taiwan athletics federation, an official PDF, or a competition host result page.
6. Only confirmed facts are entered into the AthleteTime normalized result schema.
7. Store source provenance separately:
   - discovery path: athlete-history manual review or self-submitted proof
   - confirmation path: external official result URL/file/hash

## Tool usage

```bash
node tools/extract-athlete-history-evidence.js \
  --input tmp/operator-history-note.txt \
  --output .ultra/docs/research/athlete-history-hints.json \
  --report .ultra/docs/research/athlete-history-hints.md \
  --self-submitted \
  --json
```

The input file is temporary and must be deleted after the job. It must not be committed.

## Service reflection rules

| Status | Public service behavior |
| --- | --- |
| Found only in athlete history | Do not publish. Keep as internal hint. |
| Confirmed by external official result | Eligible for normalized import. |
| Self-submitted proof only, no external confirmation | Hold as "submitted material under review." |
| Possible same-name mismatch | Do not merge. Keep as separate candidate. |

## Prohibitions

- Do not run automated bulk lookup against athlete-history pages.
- Do not store birth data, personal identifiers, institution identifiers, or raw athlete-history text.
- Do not present athlete-history-only data as an official confirmed record.
- Do not use "official ranking", "overall ranking", or "confirmed national place" copy.
- Do not merge another person's record into an athlete profile based only on name or school.

## User-facing copy candidates

- "Some overseas results are added after an operator checks public results and submitted materials."
- "Athletes with the same name may exist. Please check school, team, and year together."
- "If a record is missing, you can request a record update."

## Follow-up development

- Build an operator-only queue with these states:
  - `discovered_hint`
  - `external_confirmation_needed`
  - `confirmed`
  - `published`
  - `held`
- Build an external result source catalog for World Athletics, JAAF, Taiwan federation, official PDFs, and host result pages.
- Add search-page copy that explains overseas records may be incomplete and can be supplemented by request.

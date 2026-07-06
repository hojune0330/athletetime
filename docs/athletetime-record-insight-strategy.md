# AthleTime Record Insight Strategy

## Product Position

AthleTime is a record insight engine for Korean athletics.

The first product promise is simple:

> Search an athlete name and understand what the record means.

AthleTime should not be a loose community board first. It should become the place athletes, coaches, teammates, and fans open around competitions to find records, context, and shareable moments.

## Core Loop

1. A user searches an athlete, team, competition, or event.
2. AthleTime shows the record flow, recent results, and notable factual patterns.
3. The user creates or copies an Instagram-friendly record card.
4. Korea Athletics Magazine / io_magazine reacts, posts, or amplifies selected stories.
5. Athletes, teams, and readers send reactions, corrections, or missing data.
6. AthleTime improves search quality and insight quality.

This loop is the moat. Data creates stories, stories create attention, attention improves data.

## MVP Flow

The MVP must prove one path:

> Athlete name search -> record flow -> notable insight -> share card.

Required surfaces:

- Search-first home.
- Athlete result panel.
- Recent record flow.
- Notable insight cards.
- Instagram-style share card copy.
- Source and correction/removal note.

## Insight Types

Allowed insight types are factual patterns derived from public competition results:

- Personal best detected from source-backed AthleteTime records.
- Season best detected from the selected season.
- Record improvement across recent results.
- Consecutive final appearances.
- Consecutive podium results.
- Same-team or same-event competition context when source data supports it.

Each insight must be phrased as a data-bound observation, not a prediction.

## Copy Rules

Use:

- "public competition results"
- "AthleteTime collected public records"
- "source-traceable record"
- "recent results show"
- "based on the records currently indexed"

Avoid:

- "guaranteed"
- "official ranking" unless official ranking data is actually used
- "best in Korea" unless the complete source scope proves it
- "future national team"
- "slump", "collapse", "poor mentality", "injury risk"

Good:

> Based on AthleteTime collected public records, Kim Doyun lowered his 100m mark by 0.24 seconds across four recent races.

Bad:

> Kim Doyun is Korea's next sprint star and will be recruited soon.

## Banned Inference Classes

Do not generate or display automated claims about:

- Health, injury, body shape, or growth.
- Mental state, personality, attitude, or effort.
- School admission, scholarship, recruitment, or contract value.
- Family background or private life.
- Sensitive traits or protected characteristics.
- Negative labels about minors or youth athletes.

When in doubt, show the record and stop.

## Data And Privacy Guardrails

The service can be bold with topics, but conservative with data handling.

Minimum safeguards:

- Store source name, source type, source ID, capture time, and source URL when a valid public or licensed URL is available.
- When a source URL is not available, label the item as source metadata rather than implying a live source link.
- Store only fields needed for record context.
- Avoid birth date, address, phone number, ID number, detailed school year, and private photos unless a separate lawful basis and consent path exists.
- Provide a correction/removal request flow. For the MVP, use the GitHub issue tracker until an in-app request form exists.
- Label incomplete data clearly.
- Do not present AthleTime as an official federation service.

AI or automation does not remove responsibility. The product should be described as an automated public-record insight tool, not as an excuse for unsafe claims.

## Operating Principle

Make the topic interesting. Make the sentence defensible.

AthleTime should be willing to surface strong hooks:

- "first season best of the year"
- "three finals in a row"
- "0.24 seconds faster across recent races"
- "podium streak continues"

But every hook must trace back to source metadata or a source-traceable competition result and remain correct if read by the athlete, a parent, a coach, or a federation official.

## Near-Term Build Order

1. Home search MVP with server-backed athlete records.
2. Pure insight detector and safe copy generation.
3. Share card block for Instagram testing.
4. Browser QA for happy path and malformed search.
5. Move proven pieces into the hosted athletetime repository.

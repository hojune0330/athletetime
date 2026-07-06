---
name: trainoracle-design
description: TRAINORACLE — an AI coaching platform for elite 1500m–10000m runners. Scientific Minimalism (Tufte × Linear): warm off-white surfaces, teal-tinted ink, Deep Teal as the sole brand accent, Inter + JetBrains Mono, square corners, hairline borders. Color is for information, never decoration. Energy systems (BASE/LT/VO2/GLY/ATP/REST) are encoded as 7px dot + 2-char mono code + 1.5px underline — never as background. AI verdicts (CONFIRM/RECOMMEND/UNC/LACK) with confidence % accompany every AI utterance.
user-invocable: true
---

# TRAINORACLE Design System — Skill Map

## What this is
A **thinking tool** for elite middle-distance running coaches and athletes.
Tone: scientific journal, not sportswear ad. Honest uncertainty. Evidence-first.

## File map

| Where | What |
|---|---|
| `README.md` | High-level identity, content tone, visual foundations, iconography. **Read first.** |
| `PHILOSOPHY.md` | 10 design rules + 10 absolute prohibitions |
| `DESIGN_DECISIONS.md` | Why this direction (v1 → v2 pivot) |
| `colors_and_type.css` | All CSS variables — link this in every artifact |
| `design-system/DESIGN_TOKENS.md` | Color / type / spacing tokens (Tailwind-ready) |
| `design-system/COMPONENT_INVENTORY.md` | 47 reusable components, prop sketches |
| `design-system/SYSTEM_FOUNDATIONS.md` | 4 horizontal systems: Identity / Visualization / Trust / Feedback |
| `preview/` | Design-system cards (visible in the DS tab) |
| `ui_kits/trainoracle-app/` | Mobile + desktop UI kit — JSX components + index.html |
| `reference_designs/` | Original hi-fi HTML (Landing, Session, Dashboard, AI Chat, etc.) |
| `assets/` | Logos, marks, icon refs |
| `../athletetime-design-resource-catalog.md` | External resource adapter: Aceternity / Magic UI / HyperUI / Realtime Colors / Fontshare / Mobbin. **Read before borrowing outside UI patterns.** |

## The 10 brand-specific rules (do not break)

1. **No gradients.** Linear / radial / conic — all banned. Subtle highlighter underline is OK.
2. **No serif anywhere** (Instrument Serif was removed in v2).
3. **No emoji in UI.** User input is free.
4. **No emoji-card aesthetics.** No pastel backgrounds. No bluish-purple gradients.
5. **Square corners** (radius 0). Inputs/buttons max `4px`. Avatar circles `50%` are the only exception.
6. **Energy colors only as dot + underline.** Never as background fill.
7. **Mono for all numerics.** Pace, HR, TSS, time codes — `font-variant-numeric: tabular-nums`.
8. **AI always has a verdict + confidence %.** Plus an "alternative view" section.
9. **Preserve training terminology in English** (VO2, LT, BASE, MAIN, AUX, CK, RPE, TSS).
10. **No gamification.** No badges, streaks, levels, "great job!" toasts.

## Quick CSS hook
```html
<link rel="stylesheet" href="colors_and_type.css">
<!-- variables: --bg, --ink, --brand, --e-base...--e-rest, --sans, --mono -->
<!-- helpers: .mono, .t-h1, .t-mono-sm, .etag.vo2, .verdict.recommend -->
```

## Signature components
- **EnergyTag** — `<span class="etag vo2"><span class="d"></span><span class="c">V2</span><span class="n">VO2-Long</span></span>`
- **Verdict** — `<span class="verdict recommend">RECOMMEND · 87%</span>`
- **MAIN marker** — `※ MAIN` (mono, asterisk prefix)
- **CycleRail** — 10-cell horizontal 9.5-day timeline (the differentiator — no other product has this)

## External resource adapter
When improving AthleteTime UI with outside resources, use the catalog above as the contract.

Default order:
1. **HyperUI first** for tables, forms, empty states, lists, pagination, and practical app shells. Rebuild with TRAINORACLE tokens.
2. **Magic UI second** only for shadcn-compatible static structure. Do not add Motion by default.
3. **Aceternity only for landing/about inspiration.** Avoid app interiors, neon/glow/particles, and Pro code unless licensed.
4. **Realtime Colors only for contrast/dark-mode checks.** Do not copy its source or templates.
5. **Fontshare only for rare Latin display use.** Do not replace Pretendard/Inter/JetBrains Mono without a product decision.
6. **Mobbin only for UX pattern research.** Do not commit screenshots or clone app designs.

Every PR that borrows a resource must state: resource, use type, license note, TRAINORACLE transformation, mobile/accessibility check, and trust-tone check.

## When in doubt
> "This tool helps the coach think — it does not replace the coach."

If a design decision can't pass that line, redo it.

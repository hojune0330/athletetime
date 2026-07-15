# AthleteTime Design System

## 1. Atmosphere & Identity

AthleteTime should feel like a quiet records desk for athletes: factual, calm, and quick to scan. The signature is scientific minimalism: warm off-white surfaces, deep teal actions, square corners, compact Korean copy, and data shown as collected public records rather than official rankings.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/page | `--bg` | `#FAFAF7` | n/a | App background |
| Surface/primary | `--surface` | `#FFFFFF` | n/a | Cards, panels, inputs |
| Surface/secondary | `--surface-2` | `#F4F3EE` | n/a | Soft fills and inactive controls |
| Text/primary | `--ink` | `#0E1412` | n/a | Body, headings |
| Text/secondary | `--ink-2` | `#2B3330` | n/a | Secondary emphasis |
| Text/tertiary | `--ink-3` | `#5F6965` | n/a | Descriptions, table metadata |
| Text/muted | `--ink-4` | `#8F9894` | n/a | Hints, disabled-looking text |
| Border/default | `--line` | `#D9D6CE` | n/a | Cards, dividers, inputs |
| Border/strong | `--line-2` | `#BFBBB0` | n/a | Hover and active borders |
| Border/subtle | `--hair` | `#E8E6DF` | n/a | Internal dividers |
| Accent/brand | `--brand` | `#0D5F5A` | n/a | Primary CTAs, focus, selected state |
| Accent/brand ink | `--brand-ink` | `#07302E` | n/a | Dense brand text |
| Status/success | `--ok` | `#1F7A3A` | n/a | Confirmed actions |
| Status/warning | `--warn` | `#B4530C` | n/a | Cautions, ambiguous identity |
| Status/error | `--err` | `#A11F1F` | n/a | Errors |
| Status/info | `--info` | `#1D4ED8` | n/a | Informational states |

### Rules

- Use `brand` only for actions, selection, progress, and focus.
- Use status colors only for semantic state, never decoration.
- New components must use Tailwind tokens already mapped in `frontend/tailwind.config.js`.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | `clamp(56px, 8vw, 116px)` | 500 | 0.95 | -0.045em | Major identity only |
| H1 | `clamp(32px, 4.5vw, 52px)` | 500 | 1.1 | -0.03em | Page titles |
| H2 | `clamp(22px, 3vw, 32px)` | 500 | 1.2 | -0.02em | Major sections |
| H3 | `18px` | 500 | 1.3 | -0.01em | Card titles |
| Body/lg | `16.5px` | 400 | 1.6 | -0.005em | Lead text |
| Body | `14.5px` | 400 | 1.55 | -0.005em | Default body |
| Body/sm | `13px` | 400 | 1.5 | -0.005em | Secondary copy |
| Caption | `12px` | 400-500 | 1.45 | 0 | Metadata |
| Mono/xs | `10px` | 600 | 1.3 | 0.14em | Technical counters |

### Font Stack

- Primary: `Inter`, `"Pretendard Variable"`, `Pretendard`, system Korean sans-serif.
- Mono: `"JetBrains Mono"`, `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`.

### Rules

- Numeric records use mono or tabular figures.
- Visible Korean copy should be short and plain.
- Avoid official, certified, complete, ranking, or prediction wording unless backed by a contract.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline gaps |
| `space-2` | 8px | Compact lists |
| `space-3` | 12px | Form padding |
| `space-4` | 16px | Standard controls |
| `space-5` | 20px | Compact panels |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Card groups |
| `space-10` | 40px | Section rhythm |
| `space-12` | 48px | Major page breaks |

### Grid

- Max app width: `1100px`.
- Content width: `1240px`.
- Frame width: `1408px`.
- Mobile-first layout; 375px width must show the primary CTA for step flows.

### Rules

- Prefer one decision per mobile screen for onboarding or self-identification.
- Use `min-h-[100dvh]` or content-driven height; do not force `h-screen`.
- Keep data tables dense but readable; avoid marketing-style card grids for operational data.

## 5. Components

### Button

- **Structure**: shadcn-compatible `Button` in `frontend/src/components/ui/button.tsx`.
- **Variants**: default, outline, secondary, ghost, link, destructive.
- **Spacing**: height `h-10`, large `h-12`, icon `h-10 w-10`.
- **States**: hover color shift, active brand darkening, visible focus ring, disabled opacity.
- **Accessibility**: real `<button>` for actions, `<a>` or `Link` for navigation.

### Card

- **Structure**: `Card`, `CardHeader`, `CardContent`, `CardTitle`.
- **Spacing**: default `p-6`.
- **Surface**: white surface, hairline border, square-first radius.
- **Depth**: hierarchy from border, whitespace, and tonal shifts, not heavy shadows.

### Records Step Flow

- **Structure**: frame with back/quit controls, progress dots, one main question, sticky bottom CTA.
- **States**: disabled CTA for invalid input or no selected candidate.
- **Accessibility**: progress is text-announced, candidates use `aria-pressed`, status/error states use live regions.
- **Motion**: candidate selection must not scroll or reorder the list; step changes may reset to the top of the new step.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Press and toggle feedback |
| Standard | 200-300ms | ease-in-out | Step and panel transitions |
| Emphasis | 300ms | cubic-bezier(0.16, 1, 0.3, 1) | Page entry |

### Rules

- Animate only `transform`, `opacity`, or color.
- Do not use scroll jumps as state feedback. Resetting to the top of a newly opened step is allowed.
- Respect existing light-mode-only behavior.

## 7. Depth & Surface

### Strategy

Mixed, but restrained: hairline borders plus tonal surface shifts. Shadows are subtle and reserved for bottom fixed trays or overlays that must separate from page content.

| Type | Value | Usage |
|------|-------|-------|
| Default border | `1px solid var(--line)` | Cards, fields, rows |
| Strong border | `1px solid var(--line-2)` | Hover and selected outlines |
| Brand border | `1px solid var(--brand)` | Selected self-record and primary trays |
| Subtle shadow | `0 1px 2px rgba(0,0,0,0.04)` | Existing card compatibility |
| Bottom tray shadow | `0 -4px 16px rgba(0,0,0,0.08)` | Sticky CTA separation only |

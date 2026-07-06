import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
//
// ============================================================
// AthleTime — TRAINORACLE Design System (v3, "Scientific Minimalism")
// ------------------------------------------------------------
// Source of truth: docs/design-system-trainoracle/colors_and_type.css
//
// Strategy (universal + low-risk):
//   1. NEW canonical tokens (ink / bg / surface / brand / line / hair /
//      energy systems / verdict semantics) — use these in all new components.
//   2. LEGACY token names (primary / neutral / accent / success / danger /
//      info / track / event) are KEPT but RE-MAPPED onto the new palette,
//      so the existing 8 pages adopt the new look without code churn.
//   3. Square corners by default; rounded-xl/2xl/3xl re-mapped down to ≤4px.
// ============================================================

// --- Canonical TRAINORACLE palette ---
const ink = {
  DEFAULT: '#0E1412', // primary text (deep charcoal, teal-tinted)
  2: '#2B3330',       // secondary
  3: '#5F6965',       // tertiary / meta
  4: '#8F9894',       // quaternary / disabled
};
const brandTeal = {
  50: '#E6F0EF',
  100: '#C2DAD8',
  200: '#8FBAB6',
  300: '#5C9994',
  400: '#2E7C76',
  500: '#0D5F5A', // --brand
  600: '#0A4D49',
  700: '#07302E', // --brand-ink
  800: '#052220',
  900: '#031413',
};
// Warm-neutral scale (re-maps legacy `neutral-*` to the warm charcoal/off-white system)
const warmNeutral = {
  50: '#FAFAF7',  // --bg
  100: '#F4F3EE', // --surface-2
  200: '#E8E6DF', // --hair
  300: '#D9D6CE', // --line
  400: '#BFBBB0', // --line-2
  500: '#8F9894', // --ink-4
  600: '#5F6965', // --ink-3
  700: '#2B3330', // --ink-2
  800: '#1A201E',
  900: '#0E1412', // --ink
  950: '#070B0A',
};
const energy = {
  base: '#4A8FC7', lt: '#B8A024', vo2: '#C7761C',
  gly: '#B8332E', atp: '#7A3FB5', rest: '#7A7A70',
};

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // Light mode only
  theme: {
    extend: {
      colors: {
        // ============================================
        // shadcn/ui semantic tokens (HSL CSS variables)
        // These power every shadcn component out of the box
        // and resolve to the TRAINORACLE palette (see :root).
        // ============================================
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        // ============================================
        // NEW canonical tokens (preferred)
        // ============================================
        bg: '#FAFAF7',
        surface: '#FFFFFF',
        'surface-2': '#F4F3EE',
        ink,
        line: '#D9D6CE',
        'line-2': '#BFBBB0',
        hair: '#E8E6DF',
        brand: { ...brandTeal, DEFAULT: '#0D5F5A', ink: '#07302E' },
        // Verdict / status semantics
        ok: '#1F7A3A',
        warn: '#B4530C',
        err: '#A11F1F',
        unc: '#6B3FB0',
        // Energy systems (dot + underline ONLY — never as bg fill)
        energy,
        'e-base': energy.base,
        'e-lt': energy.lt,
        'e-vo2': energy.vo2,
        'e-gly': energy.gly,
        'e-atp': energy.atp,
        'e-rest': energy.rest,

        // ============================================
        // LEGACY names — RE-MAPPED to new palette
        // (kept so existing pages keep compiling)
        // ============================================
        // `primary` keeps its 50–900 scale (legacy pages use bg-primary-500 etc.)
        // AND gains shadcn's DEFAULT/foreground so `bg-primary` / `text-primary-foreground` work.
        primary: {
          ...brandTeal,
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // `secondary` is shadcn's neutral surface token (also used by legacy as a fallback)
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {                     // orange -> VO2 amber (energy), muted
          50: '#F7E9D9', 100: '#F0D6BB', 200: '#E3B98A', 300: '#D69A5C',
          400: '#C7761C', 500: '#C7761C', 600: '#9E5A14', 700: '#8A4A1C',
          800: '#6E3A16', 900: '#4F2A12',
          // shadcn accent (subtle surface) + readable foreground
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        neutral: warmNeutral,
        success: { 50: '#E8F0EB', 100: '#CDE2D3', 500: '#1F7A3A', 600: '#19632F', 700: '#134B24' },
        warning: { 50: '#F7EDE0', 100: '#EFD7BB', 500: '#B4530C', 600: '#90420A' },
        danger: { 50: '#F4DEDE', 100: '#E8BFBF', 500: '#A11F1F', 600: '#811919' },
        info: { 50: '#E3E9F7', 100: '#C5D1EF', 500: '#1D4ED8', 600: '#1740AD' },
        // Athletics points re-mapped to energy palette (kept for compatibility)
        track: {
          red: energy.gly, orange: energy.vo2, green: energy.base,
          yellow: energy.lt, silver: '#8F9894', bronze: '#8A4A1C',
        },
        event: {
          sprint: energy.gly, middle: energy.vo2, distance: energy.base,
          hurdles: energy.atp, field: energy.base, throws: energy.lt,
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        // Design-precise sizes from the token spec
        display: ['clamp(56px, 8vw, 116px)', { lineHeight: '0.95', letterSpacing: '-0.045em', fontWeight: '500' }],
        h1: ['clamp(32px, 4.5vw, 52px)', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '500' }],
        h2: ['clamp(22px, 3vw, 32px)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '500' }],
        h3: ['18px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-lg': ['16.5px', { lineHeight: '1.6', letterSpacing: '-0.005em' }],
        body: ['14.5px', { lineHeight: '1.55', letterSpacing: '-0.005em' }],
        'body-sm': ['13px', { lineHeight: '1.5', letterSpacing: '-0.005em' }],
        caption: ['12px', { lineHeight: '1.45' }],
        'mono-sm': ['11px', { letterSpacing: '0.06em', fontWeight: '500' }],
        'mono-xs': ['10px', { letterSpacing: '0.14em', fontWeight: '600' }],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      maxWidth: {
        app: '1100px',
        content: '1240px',
        frame: '1408px',
        article: '780px',
      },
      borderRadius: {
        // Square-first. shadcn uses lg/md/sm derived from --radius (0.25rem = 4px max).
        // Re-map legacy large radii DOWN to the 4px max.
        DEFAULT: '0',
        none: '0',
        sm: 'calc(var(--radius) - 2px)', // 2px
        md: 'calc(var(--radius) - 1px)', // 3px
        lg: 'var(--radius)',             // 4px
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '9999px', // avatars / energy dots only
      },
      borderWidth: {
        hair: '1px',
        strip: '2px',
        under: '1.5px',
      },
      boxShadow: {
        // Near-flat. Hierarchy comes from color + border + whitespace.
        subtle: '0 1px 2px rgba(0,0,0,0.04)',
        frame: '0 40px 100px -30px rgba(0,0,0,0.22), 0 10px 30px -10px rgba(0,0,0,0.12)',
        // Legacy names neutralised to subtle (no glow/heavy shadows)
        soft: '0 1px 2px rgba(0,0,0,0.04)',
        medium: '0 1px 2px rgba(0,0,0,0.04)',
        card: '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 1px 2px rgba(0,0,0,0.04)',
        'glow-primary': '0 1px 2px rgba(0,0,0,0.04)',
        'glow-accent': '0 1px 2px rgba(0,0,0,0.04)',
      },
      letterSpacing: {
        'tighter-2': '-0.025em',
        'tighter-3': '-0.035em',
        'tighter-4': '-0.045em',
        'wider-2': '0.06em',
        'widest-2': '0.14em',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        fadeInUp: 'fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        slideInRight: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
        // shadcn accordion / collapsible
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0, 0.2, 1)',
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      transitionDuration: {
        instant: '80ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

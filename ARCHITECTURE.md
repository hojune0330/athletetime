# AthleTime Architecture Blueprint

> **Version**: 2.0  
> **Last Updated**: 2026-06-03  
> **Status**: Pre-Development Cleanup Phase

---

## 1. Project Overview

**AthleTime** (애슬리트 타임) is a Korean track & field community platform that provides:

- Community board with posts, comments, likes
- Card news generation (profile cards, schedule cards, medal cards)
- Competition management & match results
- Pace calculator & training plan tools
- Live results tracking (PaceRise)
- Marketplace for used track & field gear
- Admin dashboard with pipeline control & gallery

---

## 2. Target Architecture

```
athletetime/
├── frontend/                    # React 19 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/                 # API client & endpoint modules
│   │   │   ├── client.ts        # Axios instance with interceptors
│   │   │   ├── auth.ts          # Auth API endpoints
│   │   │   ├── posts.ts         # Posts/community API
│   │   │   ├── competitions.ts  # Competition API
│   │   │   ├── marketplace.ts   # Marketplace API
│   │   │   ├── trending.ts      # Trending/Polls API
│   │   │   ├── cardStudio.ts    # Card Studio API
│   │   │   └── pacerise.ts      # PaceRise API
│   │   ├── components/
│   │   │   ├── layout/          # Layout components (Layout, Header, Footer, Sidebar)
│   │   │   ├── ui/              # Reusable UI primitives (Button, Input, Modal, Card, Badge)
│   │   │   ├── community/       # Community-specific components (PostList, PostCard, Comment)
│   │   │   ├── trending/        # Trending components (TrendPulse, HotRecords, FlashPoll)
│   │   │   ├── competitions/    # Competition components
│   │   │   ├── card-studio/     # Card Studio preview components
│   │   │   ├── marketplace/     # Marketplace components
│   │   │   └── tools/           # Tool components (PaceCalc, TrainingCalc, ScheduleCard)
│   │   ├── pages/               # Route-level page components
│   │   │   ├── MainPage.tsx
│   │   │   ├── CommunityPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── WritePage.tsx
│   │   │   ├── CompetitionsPage.tsx
│   │   │   ├── PaceRisePage.tsx
│   │   │   ├── MarketplacePage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── ScheduleCardPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   └── admin/           # Admin pages
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── AdminGallery.tsx
│   │   │       ├── AdminCardStudio.tsx
│   │   │       ├── AdminContent.tsx
│   │   │       └── AdminPipeline.tsx
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── usePosts.ts
│   │   │   ├── useTrending.ts
│   │   │   └── useCardStudio.ts
│   │   ├── context/             # React context providers
│   │   │   └── AuthContext.tsx
│   │   ├── config/              # Configuration constants
│   │   │   └── constants.ts
│   │   ├── types/               # TypeScript type definitions
│   │   │   ├── user.ts
│   │   │   ├── post.ts
│   │   │   ├── competition.ts
│   │   │   └── trending.ts
│   │   ├── utils/               # Utility functions
│   │   ├── assets/              # Static assets (images, icons)
│   │   ├── App.tsx              # Root component with route definitions
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── package.json
│
├── backend/                     # Express.js API Server (port 3005)
│   ├── src/
│   │   ├── server.js            # Main server entry (routes, middleware, DB init)
│   │   ├── db/                  # Database layer
│   │   │   ├── index.js         # DB connection & initialization
│   │   │   ├── migrations/      # SQL migration files
│   │   │   └── seeds/           # Seed data for development
│   │   ├── routes/              # Route handlers
│   │   │   ├── auth.js
│   │   │   ├── posts.js
│   │   │   ├── comments.js
│   │   │   ├── competitions.js
│   │   │   ├── marketplace.js
│   │   │   ├── trending.js
│   │   │   ├── pacerise.js
│   │   │   └── cardStudio.js
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.js          # JWT verification
│   │   │   ├── rateLimit.js
│   │   │   └── errorHandler.js
│   │   ├── services/            # Business logic
│   │   │   ├── emailService.js
│   │   │   ├── cardRenderer.js
│   │   │   └── searchService.js
│   │   └── utils/               # Backend utilities
│   │       ├── logger.js
│   │       ├── validators.js
│   │       └── sandboxDetect.js
│   ├── package.json
│   └── .env.example
│
├── card-studio/                 # Card news generation engine
│   ├── card-engine/             # Puppeteer/Playwright renderer
│   │   ├── index.js
│   │   ├── renderer.js
│   │   ├── components.js
│   │   ├── presetManager.js
│   │   └── presets/
│   ├── routes/
│   │   ├── publicRoutes.js
│   │   └── adminRoutes.js
│   └── package.json
│
├── data/                        # Processed competition data
│   ├── competitions/            # Per-year JSON files (2018-2026)
│   ├── normalized/              # Normalized data samples
│   └── history/                 # Generation history
│
├── dashboard/                   # Standalone admin dashboard (HTML/CSS/JS)
│   ├── index.html
│   ├── admin.html
│   └── css/
│       ├── tokens.css
│       ├── layout.css
│       └── components.css
│
├── community/                   # Production build output (generated by Vite)
│   └── [built assets]
│
├── docs/                        # Documentation
│   └── ARCHITECTURE.md          # This file
│
├── package.json                 # Root monorepo package (scripts, dependencies)
├── .env.example
└── .gitignore
```

---

## 3. Cleanup Tasks (v2.0 Preparation)

### 3.1 Remove All Mock Data
- **`src/server.js`**: Remove `trendStore` hardcoded data (lines ~510-560)
- Remove all mock arrays: `mockPosts`, `mockCategories`, `mockCompetitions`, `mockMarketplace`, `mockMatchResults`
- Remove standalone Mock DB fallback (lines ~249-340)
- All API endpoints should return either real DB data or appropriate empty arrays / 501 Not Implemented

### 3.2 Eliminate Duplicate Directories
- **DELETE** `src/card-engine/` — canonical version is `card-studio/card-engine/`
- **DELETE** `output/` — 66MB of generated output, no longer needed
- **DELETE** `data/raw/` — 200+ raw crawl files (58MB), processed data is in `data/competitions/`
- **DELETE** `data/debug/` — Screenshots and HTML dumps from debugging

### 3.3 Remove Legacy Files
- **DELETE** `dashboard/profile-card-v2.html`
- **DELETE** `dashboard/template-test.html`
- **DELETE** `dashboard/preview-corner-v2.html`
- **DELETE** `dashboard/preview-fullcard-v2.html`
- **DELETE** `dashboard/preview-stamp-v2.html`
- **DELETE** data crawl logs (`data/crawl*.log`)

### 3.4 Clean Root-Level Directories
- **DELETE** `tools/` — temporary tool scripts
- **DELETE** `reference/` — reference files
- **DELETE** `scripts/` — one-off scripts
- **DELETE** root `node_modules/` if present (reinstall with `npm install` after cleanup)

### 3.5 Frontend Module Restructuring
- Organize components by feature domain (`components/community/`, `components/trending/`, etc.)
- Move page components to `pages/` directory (some are scattered in `components/`)
- Create dedicated API modules in `api/` directory
- Add TypeScript type definitions in `types/` directory
- Move custom hooks to `hooks/` directory
- Ensure `NotFoundPage` renders inside Layout wrapper
- Fix `ProfilePage` redirect: navigate to `/login` instead of `/`
- Add autocomplete attributes to RegisterPage password fields
- Remove excessive debug `console.log` from WritePage

---

## 4. Module Boundaries & Contracts

### 4.1 Frontend ↔ Backend API Contract

| API Route | Method | Auth | Description |
|-----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login, returns JWT |
| `/api/auth/verify-email` | POST | No | Verify email token |
| `/api/auth/forgot-password` | POST | No | Request password reset |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/posts` | GET | No | List posts (paginated) |
| `/api/posts/:id` | GET | No | Get single post |
| `/api/posts` | POST | Yes | Create post |
| `/api/posts/:id` | PUT | Yes | Update post |
| `/api/posts/:id` | DELETE | Yes | Delete post |
| `/api/posts/:id/comments` | GET | No | List comments |
| `/api/posts/:id/comments` | POST | Yes | Create comment |
| `/api/posts/:id/like` | POST | Yes | Toggle like |
| `/api/competitions` | GET | No | List competitions |
| `/api/competitions/:id` | GET | No | Get competition detail |
| `/api/competitions` | POST | Yes (admin) | Create competition |
| `/api/competitions/:id/matchResult` | GET | No | Get match results |
| `/api/marketplace` | GET | No | List marketplace items |
| `/api/marketplace` | POST | Yes | Create listing |
| `/api/trending/topics` | GET | No | Trending topics |
| `/api/trending/hot-records` | GET | No | Hot records feed |
| `/api/flash-polls` | GET | No | Active flash polls |
| `/api/pacerise/competitions` | GET | No | Live competitions |
| `/api/pacerise/live` | GET | No | Live results |
| `/api/card-studio/competitions` | GET | No | Competitions for card gen |
| `/api/card-studio/results/competitions` | GET | No | Results for card gen |

### 4.2 Card Studio Engine Contract
- `card-engine/renderer.js` — `render(template, data) → Buffer`
- `card-engine/presetManager.js` — `listPresets()`, `getPreset(name)`, `createPreset(config)`
- `card-engine/components.js` — Reusable card UI components

### 4.3 Design Token Contract
- **Primary**: Indigo `#6366f1` (Tailwind: `indigo-500`)
- **Accent**: Orange `#f97316` (Tailwind: `orange-500`)
- **Font**: Pretendard Variable (400/500/600/700/800)
- **Layout**: Max width `1280px`, content padding `1rem` (mobile) → `2rem` (desktop)
- **Dark mode**: Dashboard uses `--color-bg: #0f1117`, dashboard-specific tokens in `dashboard/css/tokens.css`

---

## 5. Design Principles

1. **No Mock Data**: All data flows from PostgreSQL DB or returns clean empty states
2. **Single Source of Truth**: One canonical module per domain (no duplicates)
3. **Feature-Based Modules**: Components organized by feature, not by type
4. **API-First**: Frontend never contains hardcoded data; all data via API calls
5. **Graceful Degradation**: Every page renders correctly even when API is unavailable
6. **Type Safety**: All API responses typed with TypeScript interfaces
7. **Clean Build Output**: `community/` is generated, not manually maintained

---

## 6. Development Workflow

```bash
# Start backend
npm run server              # or: cd backend && node src/server.js

# Start frontend dev server
npm run dev                 # or: cd frontend && npm run dev

# Build for production
npm run build               # or: cd frontend && npm run build

# Card studio
cd card-studio && npm run dev
```

---

## 7. Environment Variables

```
# Server
PORT=3005
DATABASE_URL=postgresql://...
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
RESEND_API_KEY=xxx
FRONTEND_URL=https://athlete-time.netlify.app

# Card Studio
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
CARD_OUTPUT_DIR=./output/cards
```

---

## 8. Migration Notes (v1 → v2)

| v1 (Current) | v2 (Target) |
|---|---|
| `src/server.js` with mock data | `backend/src/server.js` — clean, DB-only |
| `src/card-engine/` (duplicate) | Only `card-studio/card-engine/` |
| `data/raw/` (58MB crawl data) | Removed (processed data in `data/competitions/`) |
| `data/debug/` (debug artifacts) | Removed |
| `output/` (66MB generated) | Removed |
| `tools/`, `reference/`, `scripts/` | Removed |
| Dashboard legacy HTML files | Removed (only `index.html`, `admin.html`, `css/`) |
| Scattered page components | Organized in `frontend/src/pages/` |
| Inline API calls | Dedicated `frontend/src/api/` modules |
| No TypeScript types | `frontend/src/types/` interfaces |

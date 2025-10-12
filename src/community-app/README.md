# AthleteTime Community App (Beta)

This package contains the new anonymous board experience for AthleteTime, rebuilt with modern tooling to mirror the UX patterns of chimhaha.net while keeping the service in beta mode.

## Tech Stack

- **Vite + React + TypeScript** with strict compiler settings
- **Tailwind CSS v4** (custom theme, forms/typography plugins)
- **React Router v7** for route-based layouts
- **TanStack Query v5** for data fetching and caching
- **React Markdown + remark-gfm** for rendering post content

## Directory Structure

```
src/community-app/
├── public/                 # Static assets served as-is
├── src/
│   ├── app/                # Providers and router configuration
│   ├── components/         # Reusable layout + UI components
│   ├── features/board/     # Mock API, hooks, mock data
│   ├── lib/                # Shared utilities, types, API client
│   ├── pages/              # Top-level routed pages
│   └── index.css           # Tailwind layers + custom styles
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Getting Started

```bash
cd src/community-app
npm install
npm run dev
```

### Environment Variables

Create a `.env` file (or `.env.local`) from the template:

```bash
cp .env.example .env
```

Available variables:

| Name | Description | Default |
| --- | --- | --- |
| `VITE_COMMUNITY_API_URL` | Backend endpoint for community APIs. Leaving empty falls back to production Render service. | `https://athletetime-backend.onrender.com/community` |

### Build & Preview

```bash
npm run build
npm run preview
```

The build artifacts are emitted to `dist/` and consumed by the Netlify deployment pipeline.

## Development Notes

- Mock data lives in `src/features/board/mocks.ts` and is used as a fallback when the API is unreachable.
- The layout is composed in `src/app/AppLayout.tsx` with dedicated sidebar/header components.
- Utility helpers (e.g. `formatRelativeTime`, `cn`) are under `src/lib`.
- Tailwind v4 no longer supports `@apply`; custom component styles are defined declaratively in `index.css`.

## Next Steps

- Replace mock API fallbacks with live endpoints once the backend is ready.
- Introduce authentication once account support exits beta.
- Add integration tests and visual regression coverage for critical flows.

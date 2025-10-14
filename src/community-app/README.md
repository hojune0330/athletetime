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
│   ├── features/board/     # Board API clients, hooks, query helpers
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
| `VITE_COMMUNITY_API_URL` | Backend endpoint for community APIs. Leave blank to use the Render Starter production service. | `https://athletetime-backend.onrender.com/community` |

### Build & Preview

```bash
npm run build
npm run preview
```

The build artifacts are emitted to `dist/` and consumed by the Netlify deployment pipeline.

## Development Notes

- 게시판 데이터는 `src/features/board/api.ts`에서 TanStack Query를 통해 바로 API에 연결됩니다. 기본값은 Render Starter 유료 플랜 실서버(`https://athletetime-backend.onrender.com/community`)를 바라보며, 베타 운영을 위해 최소한의 기본 게시판만 로컬에서 보장합니다.
- 필수 공지(베타 운영 정책)는 `HomePage`에서 기본 제공되어 더미 게시물 없이도 첫 화면이 완성됩니다.
- 레이아웃은 `src/app/AppLayout.tsx`에서 헤더 · 보드 네비게이션 · 좌측 안내 패널로 구성됩니다.
- Utility helpers (e.g. `formatRelativeTime`, `cn`) are under `src/lib`.
- Tailwind v4 no longer supports `@apply`; custom component styles are defined declaratively in `index.css`.

## Next Steps

- Connect additional backend endpoints (예: 통계/알림) after 베타 검증이 완료되면 됩니다.
- Introduce authentication and 개인화 기능 after 계정 시스템 오픈.
- Add integration tests and visual regression coverage for critical flows.

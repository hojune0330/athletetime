# Frontend Security Boundary

## Current posture

- The public site is a Vite-built, static React SPA.
- Routing starts with `BrowserRouter`; it does not run React Server Components (RSC), server actions, or React Router's unstable RSC APIs.
- Vite is kept on the patched 8.x line, and the `jspdf` transitive DOMPurify dependency is overridden to the patched 3.4.12 line.
- Tailwind and PostCSS packages are build-only dependencies. They are available to Netlify during the build but are not part of the browser runtime dependency set.

## React Router advisory boundary

GitHub's July 2026 advisory for React Router applies only when an application uses unstable RSC APIs. The package registry does not yet provide the advisory's patched 8.3.0 release, so AthleteTime stays on the current 7.x SPA line rather than introducing an unverified downgrade or prerelease.

This is an applicability boundary, not a claim that the package scanner warning has disappeared. The automated contract test verifies that the app remains a `BrowserRouter` SPA and rejects RSC imports.

## Operating rule

Do not introduce `react-server-dom`, `react-router/rsc`, `unstable_RSC`, server actions, or an RSC-capable server framework while React Router remains below 8.3.0. Before adding any of those capabilities, upgrade to the first published patched release, review its migration guide, and rerun the full frontend and records-flow checks.

Source: [GitHub Security Advisory GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2).

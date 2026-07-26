# AthleteTime Dependency Security Roadmap

> Baseline date: 2026-07-26
>
> Status: remediation roadmap. This is not a claim that the dependency tree is clean.

## 1. Why This Roadmap Exists

The existing npm audit command is currently not a reliable release signal in this repository. Both root and frontend lockfiles receive a registry `400` response from the retired quick-audit endpoint. An empty or failed npm audit response must never be read as "no vulnerabilities".

For each remediation pull request, use a current advisory source that can inspect the resolved lockfile, record the scan date and source, and then run the verification matrix in section 5. Do not use `npm audit fix --force`, do not hand-edit transitive versions, and do not regenerate root and frontend lockfiles together.

## 2. Priority Rules

1. Fix direct runtime dependencies before build-only dependencies.
2. Keep one behavioral boundary per PR so a rollback is a normal Git revert.
3. Treat major-version upgrades as compatibility changes, not lockfile housekeeping.
4. Do not claim a spreadsheet parser is remediated when its advisory has no fixed upstream release.
5. Re-scan the resolved lockfile after every change. Advisory counts change over time.

## 3. Ordered Work

### P0 - Direct runtime exposure

| Work item | Scope | Decision and required check |
| --- | --- | --- |
| jsPDF 4 | frontend PDF export | Dedicated PR upgrades `jspdf` to `4.2.1`; verify chart capture, PDF download, Korean text, and generated-file opening. |
| ws patch | backend chat transport | Update only `ws` to a current compatible patch; verify `/ws` and `/ws/chat`, malformed frames, disconnects, and room isolation. |
| Axios, React Router, PostCSS | frontend network, navigation, build | Keep one small runtime-refresh PR; verify auth cookie flow, 401/400 handling, upload/error handling, protected redirects, 404, and browser back/forward. |

### P1 - Major runtime upgrades

| Work item | Why separate | Minimum regression checks |
| --- | --- | --- |
| Multer 2 | upload middleware has breaking changes | successful upload, oversize rejection, malformed multipart rejection, Cloudinary handoff |
| Cloudinary 2 | uploader API and configuration behavior can change | `upload_stream`, delete, transformed URL persistence |
| Puppeteer refresh | browser/proxy dependency tree changes together | browser launch, screenshot/card flow, approved operational capture path |
| Resend refresh | mail provider transitive tree changes | password reset and verification-email staging smoke |
| Express 5 | route and error behavior are a real migration | auth, CSRF, cookies, parser errors, redirects, route matching, health/readiness |

### P2 - Build and developer tooling

| Work item | Rule |
| --- | --- |
| Vite and React plugin | Upgrade together; verify build, development startup, HMR, aliases, and Vite environment behavior. |
| ESLint and related tools | Fix in a lint-toolchain PR. Existing lint failures are product debt, not proof that a dependency update broke code. |
| Tailwind/tooling tree | Plan separately because Tailwind configuration and plugin compatibility can change. |

### P3 - Owner decision required

| Work item | Reason |
| --- | --- |
| `xlsx` replacement or isolation | The current advisory record has no upstream fixed version. Select a supported parser or add strict trusted-input controls; a lockfile refresh alone is not a remedy. |

## 4. Current Boundaries

- The frontend PDF export uses jsPDF through a dynamic import in `frontend/src/pages/PaceCalculatorPage/components/ChartDownloadButtons.tsx`.
- The backend chat paths use `ws` and need production WebSocket QA after an update.
- Spreadsheet parsing may handle downloaded or operator-provided files. Treat every file as untrusted until the P3 decision is complete.
- Dependency fixes do not authorize changes to the frozen legacy collector, automated news collection, draft generation, approval, or publication.

## 5. Verification Matrix for Every Dependency PR

Run the applicable checks from a clean install:

```text
npm ci
npm test
npm --prefix frontend ci
npm --prefix frontend run type-check
npm --prefix frontend run build:check
```

Run frontend lint only as an informational baseline until the existing lint-debt PR is scheduled. A pre-existing lint failure must be reported, not silently fixed inside an unrelated dependency PR.

Then perform the package-specific user scenario from section 3 in a real browser or staging environment. Build success is necessary but not sufficient for a security upgrade.

## 6. Pull Request Discipline

Every dependency PR must contain:

- one direct purpose and one lockfile scope;
- the old and new direct version;
- behavior tests and manual scenario used;
- a rescan result with date and advisory source;
- a rollback statement: revert that PR only;
- no secrets, provider responses, uploaded files, or production database data.

Use draft PRs until package-specific QA passes. Merge after a reviewer confirms the dependency's actual runtime path, not just the package manifest diff.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const app = read('src/App.tsx');
const launchSurface = read('src/config/launchSurface.ts');
const apiClient = read('src/api/client.ts');

for (const feature of ['recordsBasic', 'recordInsights', 'profileCard', 'community', 'chat', 'marketplace']) {
  check(new RegExp(`${feature}: false`).test(launchSurface), `${feature} must stay disabled for launch`);
}

for (const feature of ['home', 'paceCalculator', 'trainingCalculator', 'competitions', 'matchResults', 'auth']) {
  check(new RegExp(`${feature}: true`).test(launchSurface), `${feature} must stay enabled for launch`);
}

const primaryNavigation = launchSurface.match(/const primaryNavigationItems[\s\S]*?\] as const;/)?.[0] ?? '';
for (const route of ['/pace-calculator', '/training-calculator', '/competitions']) {
  check(primaryNavigation.includes(`path: '${route}'`), `${route} must be in primary launch navigation`);
}

for (const route of ['/community', '/chat', '/marketplace', '/records', '/profile-card', '/events', '/track', '.html']) {
  check(!primaryNavigation.includes(route), `${route} must not be in primary launch navigation`);
}

const gatedRoutes = [
  ['"/chat"', 'feature="chat"'],
  ['"/community"', 'feature="community"'],
  ['"/write"', 'feature="community"'],
  ['"/edit/:postId"', 'feature="community"'],
  ['"/marketplace"', 'feature="marketplace"'],
  ['"/records"', 'feature="recordsBasic"'],
  ['"/profile-card"', 'feature="profileCard"'],
];

for (const [route, feature] of gatedRoutes) {
  const routeIndex = app.indexOf(`path=${route}`);
  check(routeIndex >= 0, `${route} route must exist`);
  check(routeIndex >= 0 && app.slice(routeIndex, routeIndex + 500).includes(feature), `${route} must render ${feature}`);
}

for (const route of ['"/"', '"/pace-calculator"', '"/training-calculator"', '"/competitions"']) {
  check(app.includes(`path=${route}`), `${route} must remain routed`);
}

const visibleSurfaceFiles = [
  'src/components/layout/Header.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/RightBanner.tsx',
  'src/components/layout/Footer.tsx',
  'src/pages/MainPage.tsx',
  'src/components/common/ComingSoonPanel.tsx',
];

const unsafeLinkPattern = /(to|href)=["'`]{1}(\/community|\/chat|\/marketplace|\/records|\/profile-card|\/events|\/track|\/market\b|[^"'`]*\.html)/;
for (const relativePath of visibleSurfaceFiles) {
  const source = read(relativePath);
  check(!unsafeLinkPattern.test(source), `${relativePath} exposes an unsafe launch link`);
}

check(apiClient.includes("const SAME_ORIGIN_API_BASE_URL = '';"), 'API client must default to same-origin');

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log('launch surface verification passed');

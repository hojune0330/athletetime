const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { shouldWriteEvidence, writeEvidence } = require('./records-flow-e2e-evidence');
const { installApiMocks, waitForExternalObservations } = require('./records-flow-e2e-network');
const {
  getFreePort,
  startTeamApiServer,
  startViteServer,
  stopServer,
} = require('./records-flow-e2e-runtime');
const { startViteWithLock } = require('./records-flow-e2e-startup-lock');

const DEFAULT_VIEWPORT = { width: 375, height: 667 };

async function withRecordsPage(runScenario, evidence = {}) {
  const port = await getFreePort();
  const teamApiServer = await startTeamApiServer();
  const viewport = evidence.viewport || DEFAULT_VIEWPORT;
  let server;
  let browser;
  let context;
  const state = createBrowserState(port, viewport);

  try {
    server = await startViteWithLock(() => startViteServer(port));
    browser = await chromium.launch({ channel: 'chrome' });
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
    });
    state.page = await context.newPage();
    state.page.setDefaultNavigationTimeout(90_000);
    state.page.on('console', (message) => collectConsoleError(state, message));
    state.page.on('pageerror', (error) => state.pageErrors.push(error.message));
    await installApiMocks(state, teamApiServer.baseUrl);
    const result = await runScenario(state);
    await waitForExternalObservations(state);
    assertBrowserErrors(state, evidence.expectedConsoleErrors || []);
    return result;
  } finally {
    writeEvidence(state, evidence);
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) await stopServer(server);
    await teamApiServer.close();
  }
}

function createBrowserState(port, viewport) {
  return {
    page: null,
    baseUrl: `http://127.0.0.1:${port}`,
    viewport,
    visited: [],
    apiRequests: [],
    externalAttempts: [],
    externalInterceptions: [],
    externalNetworkRequests: [],
    externalObservationTasks: [],
    captureArtifacts: [],
    consoleErrors: [],
    pageErrors: [],
  };
}

function collectConsoleError(state, message) {
  if (message.type() !== 'error') return;
  const location = message.location();
  state.consoleErrors.push(
    location.url ? `${message.text()} (${location.url})` : message.text(),
  );
}

function assertBrowserErrors(state, expectedConsoleErrors) {
  const unexpectedConsoleErrors = state.consoleErrors.filter((message) => (
    !expectedConsoleErrors.some((expected) => message.includes(expected))
  ));
  assert.deepEqual(
    unexpectedConsoleErrors,
    [],
    'browser console should not contain unexpected errors',
  );
  assert.deepEqual(state.pageErrors, [], 'page should not throw errors');
}

async function expectVisible(locator) {
  await locator.first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function navigateToReady(page, url, readyLocator) {
  if (!readyLocator) throw new TypeError('navigateToReady requires a ready locator');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.readyState === 'complete'
      && !document.body?.textContent?.includes('화면을 불러오는 중...'),
    undefined,
    { timeout: 30_000 },
  );
  await expectVisible(readyLocator);
}

async function assertCountAtLeast(locator, expected, message) {
  await expectVisible(locator.first());
  const count = await locator.count();
  assert.ok(count >= expected, `${message}: expected at least ${expected}, got ${count}`);
}

async function selectedCandidateCount(page) {
  return page.locator(
    '[data-records-step="mine-candidates"] button[aria-pressed="true"]',
  ).count();
}

async function waitForSelectedCandidateCount(page, expected) {
  await page.waitForFunction((count) => (
    document.querySelectorAll(
      '[data-records-step="mine-candidates"] button[aria-pressed="true"]',
    ).length === count
  ), expected);
}

async function expectUrlParam(page, name, expectedPart) {
  await page.waitForFunction(
    ({ paramName, part }) => new URL(window.location.href)
      .searchParams.get(paramName)?.includes(part),
    { paramName: name, part: expectedPart },
  );
}

module.exports = {
  assertCountAtLeast,
  expectUrlParam,
  expectVisible,
  navigateToReady,
  selectedCandidateCount,
  shouldWriteEvidence,
  waitForSelectedCandidateCount,
  withRecordsPage,
};

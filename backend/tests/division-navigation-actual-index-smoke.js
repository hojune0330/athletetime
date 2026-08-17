const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const analytics = require('../../card-studio/services/recordAnalyticsService');
const { writeCleanupReceipt } = require('./records-flow-e2e-evidence');
const { activateFocused, reachFocusVisible } = require('./division-navigation-e2e-keyboard');
const {
  assertProductionBundleFresh,
  fingerprintFiles,
  sameSelection,
  selectActualIndexScenarios,
} = require('./division-navigation-actual-index-data');
const {
  assertLoopbackNetworkGuard,
  captureRecoveryNotice,
  installLoopbackNetworkGuard,
  startActualIndexServer,
  stopActualIndexServer,
} = require('./division-navigation-actual-index-runtime');

const ROOT = path.join(__dirname, '..', '..');
const EVIDENCE_DIR = process.env.RECORDS_E2E_EVIDENCE_DIR
  || path.join(ROOT, '.omo', 'evidence', 'athletetime-division-navigation-improvement');
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];
const FRONTEND_SOURCES = [
  'frontend/src/pages/RecordsPage.tsx',
  'frontend/src/features/record-workspace/season-navigation/seasonNavigation.ts',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordResults.tsx',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordRows.tsx',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordsPanel.tsx',
  'frontend/src/features/record-workspace/season-navigation/useSeasonRecordsController.ts',
];
const HARNESS_SOURCES = [
  'backend/tests/division-navigation-actual-index-data.js',
  'backend/tests/division-navigation-actual-index-runtime.js',
  'backend/tests/division-navigation-actual-index-smoke.js',
  'backend/tests/division-navigation-e2e-keyboard.js',
];
const BACKEND_SOURCES = [
  'card-studio/routes/recordAnalyticsRoutes.js',
  'card-studio/services/recordAnalyticsService.js',
  'data/results/index.json',
];

function requestSelection(url) {
  const params = new URL(url).searchParams;
  return {
    season: Number(params.get('season')),
    eventKey: params.get('eventKey') || '',
    divisionKey: params.get('divisionKey') || '',
  };
}

function pageSelection(url) {
  const params = new URL(url).searchParams;
  return {
    season: Number(params.get('season')),
    eventKey: params.get('event') || '',
    divisionKey: params.get('division') || '',
  };
}

function recordsUrl(baseUrl, selection) {
  const url = new URL('/records', baseUrl);
  url.searchParams.set('flow', 'browse');
  url.searchParams.set('browse', 'season');
  url.searchParams.set('keep', '1');
  url.searchParams.set('season', String(selection.season));
  url.searchParams.set('event', selection.eventKey);
  url.searchParams.set('division', selection.divisionKey);
  return url.href;
}

function isSeasonRequest(url) {
  return new URL(url).pathname.endsWith('/api/card-studio/analytics/season-records');
}

async function assertReadyStructure(page, expectedSelection) {
  await page.locator('#season-record-results tbody tr').first().waitFor({ state: 'attached' });
  assert.equal(sameSelection(pageSelection(page.url()), expectedSelection), true);
  assert.equal(new URL(page.url()).searchParams.get('keep'), '1');
  for (const selector of [
    '#season-records-season',
    '#season-records-event',
    '#season-records-division',
  ]) await page.locator(selector).waitFor({ state: 'visible' });
}

async function runViewport(browser, serverState, scenarios, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const network = await installLoopbackNetworkGuard(page, serverState.baseUrl);
  const invalidObservations = [];
  let phase = 'invalid';
  page.on('request', (request) => {
    if (phase !== 'invalid' || !isSeasonRequest(request.url())) return;
    const requested = requestSelection(request.url());
    invalidObservations.push({
      invalidRequested: sameSelection(requested, scenarios.invalidSelection),
      urlAligned: sameSelection(requested, pageSelection(page.url())),
    });
  });

  try {
    await page.goto(recordsUrl(serverState.baseUrl, scenarios.invalidSelection), { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => (
      !sameSelection(pageSelection(url.href), scenarios.invalidSelection)
      && url.searchParams.get('keep') === '1'
    ));
    await page.locator('#season-record-results tbody tr').first().waitFor({ state: 'attached' });
    assert.ok(invalidObservations.length > 0);
    assert.equal(invalidObservations.some(({ invalidRequested }) => invalidRequested), false);
    assert.equal(invalidObservations.every(({ urlAligned }) => urlAligned), true);

    phase = 'empty';
    let transformedActualNonEmpty = false;
    let emptyRequestUrlAligned = true;
    await page.route('**/api/card-studio/analytics/season-records**', async (route) => {
      const requested = requestSelection(route.request().url());
      if (!sameSelection(requested, scenarios.recoveryPair.emptySelection)) {
        await route.fallback();
        return;
      }
      emptyRequestUrlAligned = emptyRequestUrlAligned
        && sameSelection(requested, pageSelection(page.url()));
      const actualResponse = await route.fetch();
      const payload = await actualResponse.json();
      assert.equal(actualResponse.ok(), true);
      assert.ok(Array.isArray(payload.data?.rows) && payload.data.rows.length > 0);
      transformedActualNonEmpty = true;
      await route.fulfill({
        response: actualResponse,
        json: {
          ...payload,
          data: { ...payload.data, rows: [], totalIndexedAthletes: 0 },
        },
      });
    });
    await page.goto(recordsUrl(serverState.baseUrl, scenarios.recoveryPair.emptySelection), { waitUntil: 'domcontentloaded' });
    const notice = page.getByRole('status').filter({ hasText: '이 조합은 아직 정리 중이에요' });
    const recovery = page.getByRole('button', { name: '가장 가까운 시즌 보기', exact: true });
    await notice.waitFor({ state: 'visible' });
    await recovery.waitFor({ state: 'visible' });
    assert.equal(sameSelection(pageSelection(page.url()), scenarios.recoveryPair.emptySelection), true);
    assert.equal(transformedActualNonEmpty, true);
    assert.equal(emptyRequestUrlAligned, true);

    const screenshotPath = path.join(
      EVIDENCE_DIR,
      `task-5-actual-index-${viewport.width}x${viewport.height}-season-structure-masked.png`,
    );
    const screenshot = await captureRecoveryNotice(notice, screenshotPath);
    const focus = await reachFocusVisible(page, recovery);
    assert.ok(focus.accessibleName);
    const recoveryResponse = page.waitForResponse((response) => (
      isSeasonRequest(response.url())
      && sameSelection(requestSelection(response.url()), scenarios.recoveryPair.recoverySelection)
    ));
    await activateFocused(page, recovery);
    const response = await recoveryResponse;
    const recoveredPayload = await response.json();
    assert.ok(Array.isArray(recoveredPayload.data?.rows) && recoveredPayload.data.rows.length > 0);
    await assertReadyStructure(page, scenarios.recoveryPair.recoverySelection);
    await recovery.waitFor({ state: 'detached' });

    const geometry = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      oldLabelsFound: /Men High|Men All|층위 배지/u.test(document.body.innerText),
    }));
    assert.equal(geometry.innerWidth, viewport.width);
    assert.ok(geometry.scrollWidth <= geometry.innerWidth);
    assert.equal(geometry.oldLabelsFound, false);
    await assertLoopbackNetworkGuard(network);
    return {
      viewport,
      invalidDeepLinkCanonicalizedBeforeRequest: true,
      unrelatedQueryPreserved: true,
      validEmptyStayedVisible: true,
      explicitRecoveryVisible: true,
      keyboardFocusVisible: true,
      recoveryActivatedByKeyboard: true,
      recoveredNonEmpty: true,
      namedControlsVisible: true,
      innerWidth: geometry.innerWidth,
      scrollWidth: geometry.scrollWidth,
      overflow: false,
      oldLabelsFound: false,
      consoleErrors: false,
      pageErrors: false,
      failedLocalRequests: false,
      externalNetworkObserved: false,
      externalStylesIntercepted: network.externalStylesIntercepted,
      unexpectedExternalRequest: false,
      nonLocalWebSocket: false,
      ...screenshot,
      resultSurfaceSanitized: true,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  assert.equal(process.version, 'v22.17.1');
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const scenarios = selectActualIndexScenarios(analytics);
  assert.equal(scenarios.genuineValidEmptyTuplePresent, false);
  const bundleFingerprint = assertProductionBundleFresh(ROOT, FRONTEND_SOURCES);
  const sourceFingerprint = fingerprintFiles(ROOT, [
    ...FRONTEND_SOURCES,
    ...HARNESS_SOURCES,
    ...BACKEND_SOURCES,
  ]);
  let serverState;
  let browser;
  let succeeded = false;
  try {
    serverState = await startActualIndexServer(ROOT);
    const executablePath = process.env.RECORDS_E2E_EXECUTABLE_PATH;
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await runViewport(browser, serverState, scenarios, viewport));
    }
    const evidence = {
      generatedAt: new Date().toISOString(),
      runtime: process.version,
      loopbackOnly: true,
      actualLocalIndexLoaded: true,
      genuineValidEmptyTuplePresent: false,
      genuineValidEmptyAbsenceEmpiricallyProven: true,
      fallbackUsed: 'one-time local response transformation on a real advertised selection',
      fallbackPreservedActualResponseShape: true,
      recoveryTargetUsesUnmodifiedLocalIndex: true,
      persistedTupleValues: false,
      privacySafe: true,
      persistedFields: ['structural booleans', 'viewport geometry', 'sanitized image names and dimensions', 'source fingerprints'],
      sourceUrlsPersisted: false,
      rowDataPersisted: false,
      sourceFingerprint,
      bundleFingerprint,
      results,
    };
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'task-5-actual-index-smoke.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    succeeded = true;
  } finally {
    if (browser) await browser.close();
    if (serverState) await stopActualIndexServer(serverState.server);
    if (succeeded) writeCleanupReceipt();
    if (!succeeded && process.env.RECORDS_E2E_EVIDENCE_DIR) {
      fs.rmSync(EVIDENCE_DIR, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

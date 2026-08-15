const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { EVIDENCE_DIR, VIEWPORTS } = require('./division-navigation-e2e-config');
const { writeMatrixManifest } = require('./division-navigation-e2e-manifest');
const { captureViewportMatrix } = require('./division-navigation-e2e-scenarios');
const {
  filters,
  getSeasonRecordsResponse,
  getTeamSearchResponse,
} = require('./records-flow-e2e-data');
const { withRecordsPage } = require('./records-flow-e2e-fixture');
const { assertExternalNetworkIsolation } = require('./records-flow-e2e-network');

test('DIVISION-NAV-FIXTURE Given valid, invalid, and valid-empty selections Then the fake API distinguishes each state', () => {
  assert.ok(filters.availableSeasonCombinations.length > 0);
  const valid = getSeasonRecordsResponse(new URLSearchParams({
    season: '2026',
    eventKey: '100m',
    divisionKey: 'men-high',
  }));
  assert.equal(valid.status, 200);
  assert.ok(valid.body.data.rows.length > 0);
  const validEmpty = getSeasonRecordsResponse(new URLSearchParams({
    season: '2025',
    eventKey: '100m',
    divisionKey: 'men-high',
  }));
  assert.equal(validEmpty.status, 200);
  assert.equal(validEmpty.body.data.rows.length, 0);
  const invalid = getSeasonRecordsResponse(new URLSearchParams({
    season: '2025',
    eventKey: '200m',
    divisionKey: 'women-high',
  }));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'INVALID_SEASON_COMBINATION');
  const teamSearch = getTeamSearchResponse(new URLSearchParams({
    q: '예시',
    category: 'corporate',
  }));
  assert.equal(teamSearch.body.data[0].selectedCategory, 'corporate');
  assert.equal(teamSearch.body.data[0].teamLabel, '예시군청');
});

test('DIVISION-NAV-E2E Given five records states When rendered at three viewports Then division and affiliation boundaries stay usable', { timeout: 360_000 }, async () => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const captures = [];
  const networkSummaries = [];
  for (const viewport of VIEWPORTS) {
    const state = await withRecordsPage(async (browserState) => {
      await captureViewportMatrix(browserState, captures);
      return browserState;
    }, {
      viewport,
      fileName: `task-5-${viewport.width}x${viewport.height}-browser-results.json`,
      scenario: 'division navigation five-state browser matrix',
      invocation: 'exact Node 22.17.1 --test backend/tests/division-navigation-e2e.test.js',
    });
    networkSummaries.push(assertExternalNetworkIsolation(state));
  }
  writeMatrixManifest(captures, networkSummaries);
});

const fs = require('node:fs'), http = require('node:http'), net = require('node:net'), path = require('node:path');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict'), { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITE_BIN = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');
const EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence', 'track-j-records-e2e-replacement');
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, 'records-flow-e2e-results.json');
const viewport = { width: 375, height: 667 };

const athletes = [
  athlete('alpha-2016', 'Alpha Kim', 'Seoul High', [2024, 2025, 2026], ['100m', '200m'], 7),
  athlete('alpha-2020', 'Alpha Kim', 'Seoul Track Club', [2025, 2026], ['100m'], 4), athlete('beta-2016', 'Beta Park', 'Busan High', [2024, 2026], ['100m'], 5),
];

const filters = {
  seasons: [2026, 2025],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [{ key: 'men-high', label: 'Men High', gender: 'men', level: 'high' }, { key: 'men-all', label: 'Men All', gender: 'men', level: 'all' }],
  genderOptions: [{ key: 'men', label: 'Men' }],
  levelOptions: [{ key: 'all', label: 'All' }, { key: 'high', label: 'High' }],
  defaultSeasonSelection: { season: 2026, eventKey: '100m', eventLabel: '100m', divisionKey: 'men-high', divisionLabel: 'Men High', genderKey: 'men', divisionLevel: 'high', rowCount: 18 },
};

const seasonTable = {
  season: 2026, eventKey: '100m', divisionKey: 'men-high', eventLabel: '100m', divisionLabel: 'Men High', totalIndexedAthletes: 2,
  rows: athletes.slice(0, 2).map((item, index) => ({
    rank: index + 1, athleteKey: item.athleteKey, name: item.name, team: item.team,
    record: index === 0 ? '10.91' : '11.04', recordValue: index === 0 ? 10.91 : 11.04,
    date: '2026-04-10', competitionName: 'Fixture Invitational', divisionKey: 'men-high',
    divisionLabel: 'Men High', divisionLevel: 'high', divisionDetail: null,
    wind: '+0.7', windLegal: true, highlighted: index === 0,
  })),
  filters,
  disclaimer: 'QA fixture',
};

function athlete(athleteKey, name, team, years, events, recordCount) {
  return { athleteKey, name, team, teams: [team], years, events, divisions: ['Men High'], recordCount, ambiguity: 'name_team', note: '' };
}

function makeRecord(item, index) {
  const record = index === 0 ? '10.91' : '11.04';
  const recordValue = index === 0 ? 10.91 : 11.04;
  return {
    id: `${item.athleteKey}-${index}`, athleteKey: item.athleteKey, name: item.name, team: item.team,
    season: 2026, competitionName: 'Fixture Invitational',
    date: `2026-04-${String(index + 10).padStart(2, '0')}`,
    venue: 'Fixture Stadium', eventKey: '100m', eventLabel: '100m',
    divisionKey: 'men-high', divisionLabel: 'Men High', gender: 'men', divisionLevel: 'high',
    divisionDetail: null, rawDivision: 'Men High', phase: 'final', record, recordValue,
    direction: 'lower', rank: index + 1, wind: '+0.7', windLegal: true, isComparable: true, note: '',
    source: { provider: 'athletetime_fixture', sourceType: 'qa_fixture', sourceId: `qa-${item.athleteKey}`, sourceUrl: '', capturedAt: '2026-07-13T00:00:00.000Z' },
  };
}

function makeProfile(key) {
  const item = athletes.find((candidate) => candidate.athleteKey === key) || athletes[0];
  const records = [makeRecord(item, 0), makeRecord(item, 1)];
  return {
    athlete: item,
    summary: { indexedBest: records[0], seasonBest: records[0], latest: records[1], delta: null, indexedResultCount: records.length, comparableResultCount: records.length, sourceScope: 'qa_fixture', disclaimer: 'QA fixture' },
    events: [{ eventKey: '100m', eventLabel: '100m', recordCount: records.length, best: records[0] }],
    recordTrail: records.map((record) => ({
      id: record.id, date: record.date, season: record.season, value: record.recordValue,
      record: record.record, eventLabel: record.eventLabel, competitionName: record.competitionName,
      isComparable: record.isComparable,
    })),
    records,
  };
}

async function withRecordsPage(runScenario) {
  const port = await getFreePort();
  const server = await startViteServer(port);
  let browser;
  let context;
  const state = { page: null, baseUrl: `http://127.0.0.1:${port}`, visited: [], consoleErrors: [], pageErrors: [] };

  try {
    browser = await chromium.launch({ channel: 'chrome' });
    context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true });
    state.page = await context.newPage();
    state.page.on('console', (message) => {
      if (message.type() === 'error') state.consoleErrors.push(message.text());
    });
    state.page.on('pageerror', (error) => state.pageErrors.push(error.message));
    await installApiMocks(state.page);
    await runScenario(state);
    assert.deepEqual(state.consoleErrors, [], 'browser console should not contain errors');
    assert.deepEqual(state.pageErrors, [], 'page should not throw errors');
  } finally {
    writeEvidence(state);
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopServer(server);
  }
}

async function installApiMocks(page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    await fulfillApi(route, url.pathname);
  });
}

async function fulfillApi(route, pathname) {
  if (pathname.endsWith('/analytics/filters')) return fulfillJson(route, { success: true, data: filters });
  if (pathname.endsWith('/analytics/popular-events')) {
    return fulfillJson(route, {
      success: true,
      data: { season: 2026, events: filters.events.map((event) => ({ ...event, recordCount: 12, athleteCount: 7 })), note: 'QA fixture' },
    });
  }
  if (pathname.endsWith('/analytics/records/search')) return fulfillJson(route, { success: true, total: athletes.length, data: athletes });
  if (pathname.includes('/analytics/athletes/')) {
    const key = decodeURIComponent(pathname.split('/').pop() || '');
    return fulfillJson(route, { success: true, data: makeProfile(key) });
  }
  if (pathname.endsWith('/analytics/season-records')) return fulfillJson(route, { success: true, data: seasonTable });
  if (pathname.endsWith('/analytics/insights')) return fulfillJson(route, { success: true, data: makeInsights() });
  return fulfillJson(route, { success: true, data: null });
}

function makeInsights() {
  return {
    generatedAt: '2026-07-13T00:00:00.000Z',
    scope: 'qa_fixture',
    privacy: { includesNames: false, includesTeams: false, includesAthleteKeys: false, minGroupSize: 3 },
    season: 2026,
    eventConcentration: [{ eventKey: '100m', eventLabel: '100m', recordCount: 22, athleteCount: 12 }],
    regionActivity: [{ regionCode: 'seoul', regionLabel: 'Seoul', recordCount: 12, eventCount: 3 }],
    seasonPulse: { windowDays: 28, from: '2026-06-01', to: '2026-06-28', buckets: [{ weekStart: '2026-06-01', weekEnd: '2026-06-07', recordCount: 3 }] },
  };
}

async function fulfillJson(route, data) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
}

async function startViteServer(port) {
  assert.ok(fs.existsSync(VITE_BIN), `Vite binary not found at ${VITE_BIN}`);
  const child = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: FRONTEND,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  try {
    await waitForHttp(`http://127.0.0.1:${port}/records`, 30_000);
  } catch (error) {
    await stopServer({ child });
    error.message = `${error.message}\nVite output:\n${output.join('')}`;
    throw error;
  }
  return { child };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const status = await requestStatus(url);
      if (status && status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(2_000, () => {
      req.destroy(new Error(`Timed out requesting ${url}`));
    });
  });
}

async function stopServer(server) {
  const child = server.child;
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function writeEvidence(state) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    scenario: 'records flow e2e',
    invocation: 'node --test backend/tests/records-flow-e2e.test.js',
    baseUrl: state.baseUrl,
    viewport,
    visited: state.visited,
    consoleErrors: state.consoleErrors,
    pageErrors: state.pageErrors,
  }, null, 2));
}

async function expectVisible(locator) {
  await locator.first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function assertCountAtLeast(locator, expected, message) {
  await expectVisible(locator.first());
  const count = await locator.count();
  assert.ok(count >= expected, `${message}: expected at least ${expected}, got ${count}`);
}

async function selectedCandidateCount(page) {
  return page.locator('[data-records-step="mine-candidates"] button[aria-pressed="true"]').count();
}

async function waitForSelectedCandidateCount(page, expected) {
  await page.waitForFunction((count) => {
    return document.querySelectorAll('[data-records-step="mine-candidates"] button[aria-pressed="true"]').length === count;
  }, expected);
}

async function expectUrlParam(page, name, expectedPart) {
  await page.waitForFunction(
    ({ paramName, part }) => new URL(window.location.href).searchParams.get(paramName)?.includes(part),
    { paramName: name, part: expectedPart },
  );
}

module.exports = { assertCountAtLeast, expectUrlParam, expectVisible, selectedCandidateCount, waitForSelectedCandidateCount, withRecordsPage };

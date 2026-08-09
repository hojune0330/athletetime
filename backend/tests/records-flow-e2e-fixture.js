const fs = require('node:fs'), http = require('node:http'), net = require('node:net'), path = require('node:path');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict'), { chromium } = require('playwright');
const express = require('express');
const recordAnalyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');
const { filters, getSearchResults, makeInsights, makeProfile, makeWorkspacePreview, seasonTable } = require('./records-flow-e2e-data');

const ROOT = path.join(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITE_BIN = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');
const EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence', 'track-j-records-e2e-replacement');
const viewport = { width: 375, height: 667 };


async function withRecordsPage(runScenario, evidence = {}) {
  const port = await getFreePort();
  const teamApiServer = await startTeamApiServer();
  let server;
  let browser;
  let context;
  const state = { page: null, baseUrl: `http://127.0.0.1:${port}`, visited: [], consoleErrors: [], pageErrors: [] };

  try {
    server = await startViteServer(port);
    browser = await chromium.launch({ channel: 'chrome' });
    context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true });
    state.page = await context.newPage();
    state.page.on('console', (message) => {
      if (message.type() === 'error') state.consoleErrors.push(message.text());
    });
    state.page.on('pageerror', (error) => state.pageErrors.push(error.message));
    await installApiMocks(state.page, teamApiServer.baseUrl);
    await runScenario(state);
    assert.deepEqual(state.consoleErrors, [], 'browser console should not contain errors');
    assert.deepEqual(state.pageErrors, [], 'page should not throw errors');
  } finally {
    writeEvidence(state, evidence);
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) await stopServer(server);
    await teamApiServer.close();
  }
}

async function installApiMocks(page, teamApiBaseUrl) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    await fulfillApi(route, url, teamApiBaseUrl);
  });
}

async function fulfillApi(route, url, teamApiBaseUrl) {
  const pathname = url.pathname;
  if (pathname.endsWith('/analytics/record-workspaces/preview')) {
    const response = await route.fetch({ url: `${teamApiBaseUrl}${pathname}${url.search}` });
    return route.fulfill({ response });
  }
  if (pathname.includes('/analytics/teams')) {
    const response = await route.fetch({ url: `${teamApiBaseUrl}${pathname}${url.search}` });
    return route.fulfill({ response });
  }
  if (pathname.endsWith('/analytics/filters')) return fulfillJson(route, { success: true, data: filters });
  if (pathname.endsWith('/analytics/popular-events')) {
    return fulfillJson(route, {
      success: true,
      data: { season: 2026, events: filters.events.map((event) => ({ ...event, recordCount: 12, athleteCount: 7 })), note: 'QA fixture' },
    });
  }
  if (pathname.endsWith('/analytics/records/search')) {
    const query = url.searchParams.get('q')?.trim().toLowerCase() || '';
    const results = getSearchResults(query);
    return fulfillJson(route, { success: true, total: results.length, data: results });
  }
  if (pathname.includes('/analytics/athletes/')) {
    const key = decodeURIComponent(pathname.split('/').pop() || '');
    return fulfillJson(route, { success: true, data: makeProfile(key) });
  }
  if (pathname.endsWith('/analytics/season-records')) return fulfillJson(route, { success: true, data: seasonTable });
  if (pathname.endsWith('/analytics/insights')) return fulfillJson(route, { success: true, data: makeInsights() });
  return fulfillJson(route, { success: true, data: null });
}

async function startTeamApiServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/api/card-studio/analytics/record-workspaces/preview', express.json(), (req, res) => {
    const subjectKeys = Array.isArray(req.body?.subjectKeys)
      ? req.body.subjectKeys.filter((subjectKey) => typeof subjectKey === 'string')
      : [];
    return res.json({ success: true, data: makeWorkspacePreview(subjectKeys) });
  });
  app.use('/api/card-studio/analytics', recordAnalyticsRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function fulfillJson(route, data) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
}

async function startViteServer(port) {
  assert.ok(fs.existsSync(VITE_BIN), `Vite binary not found at ${VITE_BIN}`);
  const child = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: FRONTEND,
    env: { ...process.env, BROWSER: 'none', VITE_API_BASE_URL: '' },
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

function writeEvidence(state, evidence) {
  if (!shouldWriteEvidence()) return;
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidencePath = path.join(EVIDENCE_DIR, evidence.fileName || 'records-flow-e2e-results.json');
  fs.writeFileSync(evidencePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    scenario: evidence.scenario || 'records flow e2e',
    invocation: evidence.invocation || 'node --test backend/tests/records-flow-e2e.test.js',
    baseUrl: state.baseUrl,
    viewport,
    visited: state.visited,
    consoleErrors: state.consoleErrors,
    pageErrors: state.pageErrors,
  }, null, 2));
}

function shouldWriteEvidence(value = process.env.WRITE_E2E_EVIDENCE) {
  return value === '1';
}

async function expectVisible(locator) {
  await locator.first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function navigateToReady(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.readyState === 'complete' && !document.body?.textContent?.includes('화면을 불러오는 중...'),
    undefined,
    { timeout: 10_000 },
  );
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

module.exports = { assertCountAtLeast, expectUrlParam, expectVisible, navigateToReady, selectedCandidateCount, shouldWriteEvidence, waitForSelectedCandidateCount, withRecordsPage };

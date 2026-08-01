const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const { createRequestBodyParser } = require('../../card-studio/middleware/requestBodyParser');
const { workspacePreviewLimiter } = require('../../card-studio/middleware/rateLimiter');
const { createRecordWorkspaceRouter } = require('../../card-studio/routes/recordWorkspaceRoutes');
const { parseRecordWorkspacePreviewInput } = require('../../card-studio/services/recordWorkspacePreviewInput');

function invoke(limiter, ip) {
  const headers = {};
  let statusCode = 200;
  let body = null;
  let nextCalled = false;
  const response = {
    setHeader(name, value) { headers[name.toLowerCase()] = String(value); },
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  limiter({ ip, headers: {}, socket: {} }, response, () => { nextCalled = true; });
  return { body, headers, nextCalled, statusCode };
}

async function startPreviewServer(previewService) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(createRequestBodyParser());
  app.use('/api/card-studio/analytics/record-workspaces', createRecordWorkspaceRouter({ previewService }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(baseUrl, method, pathname, body, headers = {}) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: payload,
  });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.json(),
  };
}

function fixturePreview(input) {
  const availableKeys = input.subjectKeys.filter((key) => key === '1111111111111111');
  if (availableKeys.length === 0) return null;
  return {
    subjects: [{ athleteKey: '1111111111111111', name: '가람', team: '서울고', teams: ['서울고'], years: [2025], events: ['100m'], divisions: ['남자부'], recordCount: 1, ambiguity: 'name_team', note: '' }],
    unavailableSubjectKeys: input.subjectKeys.filter((key) => key !== '1111111111111111'),
    identity: { displayName: '가람', distinctNames: ['가람'], warning: 'none' },
    affiliations: [],
    coverage: { totalMatched: 1, returned: 1, hasMore: false, nextCursor: null, observedSeasons: [2025], competitionCount: 1, sourceCount: 1, lastCapturedAt: '2026-07-29T00:00:00.000Z', qualityState: 'visible_index' },
    events: [],
    records: [],
  };
}

function createFixturePreviewService() {
  return {
    getRecordWorkspacePreview(input) {
      return fixturePreview(parseRecordWorkspacePreviewInput(input));
    },
  };
}

test('Given the workspace preview route When a valid JSON POST is received Then it is uncached and GET has no route', async (t) => {
  const server = await startPreviewServer(createFixturePreviewService());
  t.after(server.close);

  // Given an API route mounted beneath the public Card Studio prefix.
  // When a client calls the preview with POST and then tries GET.
  const post = await request(server.baseUrl, 'POST', '/api/card-studio/analytics/record-workspaces/preview', { subjectKeys: ['1111111111111111'] });
  const get = await fetch(`${server.baseUrl}/api/card-studio/analytics/record-workspaces/preview`);

  // Then only POST returns the bounded preview and its response is never cached.
  assert.equal(post.status, 200);
  assert.equal(post.headers['cache-control'], 'no-store');
  assert.equal(post.body.data.coverage.totalMatched, 1);
  assert.equal(get.status, 404);
});

test('Given invalid or oversized preview input When it reaches the public route Then it has a documented bounded failure', async (t) => {
  const server = await startPreviewServer(createFixturePreviewService());
  t.after(server.close);

  // Given a malformed key set and a JSON body above four kilobytes.
  // When both requests reach the route boundary.
  const invalid = await request(server.baseUrl, 'POST', '/api/card-studio/analytics/record-workspaces/preview', { subjectKeys: [] });
  const oversized = await request(server.baseUrl, 'POST', '/api/card-studio/analytics/record-workspaces/preview', { subjectKeys: ['1111111111111111'], padding: 'x'.repeat(4_100) });

  // Then each failure is explicit, uncached, and does not echo the request body.
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'INVALID_SUBJECT_KEYS');
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.code, 'REQUEST_TOO_LARGE');
  assert.equal(oversized.headers['cache-control'], 'no-store');
  assert.equal(JSON.stringify(oversized.body).includes('x'.repeat(100)), false);
});

test('Given repeated preview calls from one address When the thirty-first call arrives Then it is limited even for administrators', () => {
  const ip = `198.51.100.${(process.pid % 200) + 1}`;

  // Given thirty accepted calls in the dedicated one-minute window.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.equal(invoke(workspacePreviewLimiter, ip).nextCalled, true);
  }

  // When the next call is attempted from the same address.
  const denied = invoke(workspacePreviewLimiter, ip);

  // Then it is rejected with the shared rate-limit envelope and no-store policy.
  assert.equal(denied.statusCode, 429);
  assert.equal(denied.body.success, false);
  assert.equal(denied.headers['cache-control'], 'no-store');
  assert.equal(denied.headers['x-ratelimit-limit'], '30');
});

test('Given a partial or fully unavailable preview When the route serializes it Then it discloses only public keys and no reason', async (t) => {
  const server = await startPreviewServer(createFixturePreviewService());
  t.after(server.close);

  // Given one visible key, one missing key, and a request with no visible keys.
  // When each request is serialized through the public route.
  const partial = await request(server.baseUrl, 'POST', '/api/card-studio/analytics/record-workspaces/preview', { subjectKeys: ['1111111111111111', '2222222222222222'] });
  const unavailable = await request(server.baseUrl, 'POST', '/api/card-studio/analytics/record-workspaces/preview', { subjectKeys: ['2222222222222222'] });

  // Then partial success exposes no reason and full unavailability uses the generic error code.
  assert.equal(partial.status, 200);
  assert.deepEqual(partial.body.data.unavailableSubjectKeys, ['2222222222222222']);
  assert.equal(JSON.stringify(partial.body).includes('reason'), false);
  assert.equal(unavailable.status, 404);
  assert.equal(unavailable.body.code, 'WORKSPACE_NOT_AVAILABLE');
});

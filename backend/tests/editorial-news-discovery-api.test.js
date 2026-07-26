const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const { requireCsrfForCookieAuth } = require('../utils/authCookies');
const { createEditorialAdminRouter } = require('../routes/editorialAdmin');

const actorUserId = '00000000-0000-4000-8000-000000000001';
const discoveryId = '20000000-0000-4000-8000-000000000001';

async function startApi() {
  const calls = [];
  const newsDiscoveryService = {
    calls,
    async runManual(input) { calls.push(['run', input]); return { id: 'run-1', status: 'completed', actorUserId: input.actorUserId, apiCallCount: 1 }; },
    async listRuns(input) { calls.push(['runs', input]); return [{ id: 'run-1', status: 'completed', safeErrorCode: null }]; },
    async listDiscoveries() { return { discoveries: [{ id: discoveryId, title: '육상 소식', reviewNote: 'private', reviewedBy: actorUserId }], nextCursor: null }; },
    async transitionDiscovery(input) { calls.push(['transition', input]); return { id: input.id, status: input.status, reviewNote: input.reviewNote, reviewedBy: input.actorUserId }; },
  };
  const app = express(); app.use(express.json()); app.use(requireCsrfForCookieAuth);
  app.use('/api/admin/editorial', (req, res, next) => { if (!req.get('X-Test-Role')) return res.sendStatus(401); if (req.get('X-Test-Role') !== 'admin') return res.sendStatus(403); req.user = { id: actorUserId }; return next(); }, createEditorialAdminRouter({ service: {}, newsDiscoveryService }));
  const server = http.createServer(app); await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function request(api, method, pathname, body, headers = {}) {
  const response = await fetch(`${api.baseUrl}${pathname}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { response, body: text && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : null };
}

test('NEWS-API-001: discovery mutations require admin CSRF and responses are safe', async (t) => {
  // Given
  const api = await startApi(); t.after(api.close);
  const headers = { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf', 'X-CSRF-Token': 'csrf' };

  // When
  const denied = await request(api, 'POST', '/api/admin/editorial/news-discoveries/run');
  const member = await request(api, 'POST', '/api/admin/editorial/news-discoveries/run', {}, { 'X-Test-Role': 'member' });
  const missingCsrf = await request(api, 'POST', '/api/admin/editorial/news-discoveries/run', {}, { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf' });
  const run = await request(api, 'POST', '/api/admin/editorial/news-discoveries/run', {}, headers);
  const page = await request(api, 'GET', '/api/admin/editorial/news-discoveries', undefined, { 'X-Test-Role': 'admin' });
  const runs = await request(api, 'GET', '/api/admin/editorial/news-discoveries/runs?limit=10', undefined, { 'X-Test-Role': 'admin' });
  const changed = await request(api, 'POST', `/api/admin/editorial/news-discoveries/${discoveryId}/dismiss`, { reviewNote: 'Not relevant' }, headers);

  // Then
  assert.equal(denied.response.status, 401);
  assert.equal(member.response.status, 403);
  assert.equal(missingCsrf.response.status, 403);
  assert.equal(run.response.headers.get('cache-control'), 'no-store');
  assert.equal(page.response.headers.get('cache-control'), 'no-store');
  assert.equal(runs.response.headers.get('cache-control'), 'no-store');
  assert.equal(changed.response.headers.get('cache-control'), 'no-store');
  assert.equal(JSON.stringify(page.body).includes('reviewNote'), false);
  assert.equal(JSON.stringify(changed.body).includes('reviewedBy'), false);
  assert.deepEqual(api.calls.map(([type]) => type), ['run', 'runs', 'transition']);
});

test('NEWS-API-002: malformed pagination is rejected before the service boundary', async (t) => {
  // Given
  const api = await startApi(); t.after(api.close);

  // When
  const response = await request(api, 'GET', '/api/admin/editorial/news-discoveries?cursor=not-base64', undefined, { 'X-Test-Role': 'admin' });
  const status = await request(api, 'GET', '/api/admin/editorial/news-discoveries?status=published', undefined, { 'X-Test-Role': 'admin' });
  const limit = await request(api, 'GET', '/api/admin/editorial/news-discoveries?limit=101', undefined, { 'X-Test-Role': 'admin' });
  const range = await request(api, 'GET', '/api/admin/editorial/news-discoveries?range=year', undefined, { 'X-Test-Role': 'admin' });
  const runsLimit = await request(api, 'GET', '/api/admin/editorial/news-discoveries/runs?limit=101', undefined, { 'X-Test-Role': 'admin' });

  // Then
  assert.equal(response.response.status, 400);
  assert.equal(status.response.status, 400);
  assert.equal(limit.response.status, 400);
  assert.equal(range.response.status, 400);
  assert.equal(runsLimit.response.status, 400);
  assert.equal(api.calls.length, 0);
});

test('NEWS-API-003: manual runs reject arbitrary input and full discovery statuses remain listable', async (t) => {
  // Given
  const api = await startApi(); t.after(api.close);
  const headers = { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf', 'X-CSRF-Token': 'csrf' };

  // When
  const injected = await request(api, 'POST', '/api/admin/editorial/news-discoveries/run', { query: 'private custom query' }, headers);
  const confirmed = await request(api, 'GET', '/api/admin/editorial/news-discoveries?status=source_confirmed&range=month', undefined, { 'X-Test-Role': 'admin' });
  const linked = await request(api, 'GET', '/api/admin/editorial/news-discoveries?status=calendar_linked&range=today', undefined, { 'X-Test-Role': 'admin' });

  // Then
  assert.equal(injected.response.status, 400);
  assert.equal(confirmed.response.status, 200);
  assert.equal(linked.response.status, 200);
  assert.equal(api.calls.length, 0);
});

test('NEWS-API-004: dedicated review actions derive their state server-side', async (t) => {
  // Given
  const api = await startApi(); t.after(api.close);
  const headers = { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf', 'X-CSRF-Token': 'csrf' };

  // When
  const reviewing = await request(api, 'POST', `/api/admin/editorial/news-discoveries/${discoveryId}/start-review`, {}, headers);
  const invalidDismissal = await request(api, 'POST', `/api/admin/editorial/news-discoveries/${discoveryId}/dismiss`, {}, headers);

  // Then
  assert.equal(reviewing.response.status, 200);
  assert.equal(invalidDismissal.response.status, 400);
  assert.deepEqual(api.calls[0], ['transition', { id: discoveryId, actorUserId, status: 'reviewing', reviewNote: undefined }]);
});

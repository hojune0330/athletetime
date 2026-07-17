const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  parseActionBody,
  parseIssueCreateBody,
  parseSourceBody,
} = require('../../card-studio/services/editorialRequestParsers');
const { assertSafeSourceUrl } = require('../../card-studio/services/editorialSourceUrlPolicy');
const { EditorialIssueService } = require('../../card-studio/services/editorialIssueService');
const {
  ACTOR_ID,
  ISSUE_ID,
  assertNoPrivateFields,
  createFakeService,
  issueBody,
  request,
  startApi,
} = require('./helpers/communityEditorialApiHarness');

test('EDITORIAL-API-001: request parsers accept exact payloads and reject extra fields', () => {
  assert.deepEqual(parseIssueCreateBody(issueBody()), issueBody());
  assert.deepEqual(parseActionBody({ expectedVersion: 2, note: 'Review complete' }), {
    expectedVersion: 2, note: 'Review complete',
  });
  assert.deepEqual(parseSourceBody({
    expectedVersion: 1,
    sourceUrl: 'https://example.com/results.pdf',
    sourceKind: 'official',
    title: 'Official results',
  }), {
    expectedVersion: 1,
    sourceUrl: 'https://example.com/results.pdf',
    sourceKind: 'official',
    title: 'Official results',
  });
  assert.throws(() => parseIssueCreateBody(issueBody({ unexpected: true })), /unexpected/u);
  assert.throws(() => parseIssueCreateBody(issueBody({ title: 'x'.repeat(201) })), /title/u);
  assert.throws(() => parseIssueCreateBody(issueBody({ author: 'AI reporter' })), /author/u);
  assert.throws(() => parseActionBody({ expectedVersion: 0 }), /expectedVersion/u);
});

test('EDITORIAL-API-000: production mount uses CSRF before JWT admin guards', () => {
  const root = path.resolve(__dirname, '../..');
  const server = fs.readFileSync(path.join(root, 'src/server.js'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'backend/routes/editorialAdmin.js'), 'utf8');
  const csrfIndex = server.indexOf('app.use(requireCsrfForCookieAuth)');
  const adminIndex = server.indexOf("'/api/admin/editorial'");
  assert.ok(csrfIndex >= 0 && adminIndex > csrfIndex);
  assert.match(server, /'\/api\/admin\/editorial',[\s\S]{0,160}authenticateToken,[\s\S]{0,80}jwtRequireAdmin/u);
  assert.equal(route.includes('optionalAuth'), false);
});

test('EDITORIAL-API-002: source URLs are HTTPS and reject obvious private targets', () => {
  assert.equal(assertSafeSourceUrl('https://example.com/results.pdf'), 'https://example.com/results.pdf');
  for (const url of [
    'http://example.com/result', 'https://user:pass@example.com/result',
    'https://localhost/result', 'https://127.0.0.1/result', 'https://10.0.0.1/result',
    'https://169.254.169.254/result', 'https://[::1]/result', 'https://[fc00::1]/result',
  ]) assert.throws(() => assertSafeSourceUrl(url), /sourceUrl/u, url);
});

test('EDITORIAL-API-003: admin writes enforce role, CSRF, actor, and version', async (t) => {
  const service = createFakeService();
  const api = await startApi(service);
  t.after(api.close);
  assert.equal((await request(api.baseUrl, 'POST', '/api/admin/editorial/issues', {
    body: issueBody(),
  })).status, 401);
  assert.equal((await request(api.baseUrl, 'POST', '/api/admin/editorial/issues', {
    headers: { 'X-Test-Role': 'user' }, body: issueBody(),
  })).status, 403);
  const missingCsrf = await request(api.baseUrl, 'POST', '/api/admin/editorial/issues', {
    headers: { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf' },
    body: issueBody(),
  });
  assert.equal(missingCsrf.status, 403);
  const created = await request(api.baseUrl, 'POST', '/api/admin/editorial/issues', {
    headers: {
      'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf',
      'X-CSRF-Token': 'csrf',
    },
    body: issueBody(),
  });
  assert.equal(created.status, 201);
  assert.equal(service.calls[0][1].actorUserId, ACTOR_ID);
  assertNoPrivateFields(created.body);
  const stale = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${ISSUE_ID}/approve`, {
    headers: { 'X-Test-Role': 'admin' }, body: { expectedVersion: 99 },
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'EDITORIAL_VERSION_CONFLICT');
});

test('EDITORIAL-API-005: public magazine exposes only allowlisted fields', async (t) => {
  const api = await startApi(createFakeService());
  t.after(api.close);
  const list = await request(api.baseUrl, 'GET', '/api/editorial/magazine');
  const detail = await request(api.baseUrl, 'GET', `/api/editorial/magazine/magazine-${ISSUE_ID}`);
  assert.equal(list.status, 200);
  assert.equal(detail.status, 200);
  assert.equal(Object.hasOwn(detail.body.issue, 'version'), false);
  assert.equal(Object.hasOwn(detail.body.issue, 'author'), false);
  assertNoPrivateFields(list.body);
  assertNoPrivateFields(detail.body);
});

test('EDITORIAL-API-006: service maps actions without fetching source URLs', async () => {
  const calls = [];
  const repository = {
    async transitionIssue(input) { calls.push(['transitionIssue', input]); return input; },
    async finishIssue(input) { calls.push(['finishIssue', input]); return input; },
    async correctIssue(input) { calls.push(['correctIssue', input]); return input; },
    async addSource(input) { calls.push(['addSource', input]); return input; },
  };
  const service = new EditorialIssueService(repository, {
    resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }],
  });
  const previousFetch = global.fetch;
  global.fetch = async () => { throw new Error('must never fetch'); };
  try {
    await service.addSource({ sourceUrl: 'https://example.com/results.pdf' });
    await service.act('check', { issueId: ISSUE_ID, actorUserId: ACTOR_ID, expectedVersion: 2 });
    await service.act('reject', {
      issueId: ISSUE_ID, actorUserId: ACTOR_ID, expectedVersion: 3, note: 'Needs evidence',
    });
  } finally {
    global.fetch = previousFetch;
  }
  assert.deepEqual(calls.map(([name]) => name), ['addSource', 'transitionIssue', 'finishIssue']);
});

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const { createEditorialAdminRouter } = require('../routes/editorialAdmin');
const parsers = require('../../card-studio/services/editorialRequestParsers');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const ISSUE_ID = '10000000-0000-4000-8000-000000000001';

function revisionBody() {
  return {
    expectedVersion: 1,
    title: 'Draft title',
    content: 'Draft content',
    summary: 'Summary',
    whyNow: 'Why now',
    discussionQuestion: 'Question?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    reviewNote: 'Clarified the draft',
  };
}

async function startApi(service) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: ACTOR_ID }; next(); });
  app.use('/api/admin/editorial', createEditorialAdminRouter({ service }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(baseUrl, method, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

test('EDITORIAL-DRAFT-API-001: UUID and public slug parameters are strict', () => {
  assert.equal(parsers.parseUuidParam(ISSUE_ID), ISSUE_ID);
  assert.equal(parsers.parseMagazineSlug(`magazine-${ISSUE_ID}`), `magazine-${ISSUE_ID}`);
  for (const malformed of ['1', `${ISSUE_ID}/sources`, `${ISSUE_ID}' OR 1=1`, 'not-a-uuid']) {
    assert.throws(() => parsers.parseUuidParam(malformed), /UUID/u);
  }
  assert.throws(() => parsers.parseMagazineSlug('weekly-track-preview'), /slug/u);
});

test('EDITORIAL-DRAFT-API-002: admins can read and revise a draft with actor and version', async (t) => {
  const calls = [];
  const issue = { id: ISSUE_ID, slug: `magazine-${ISSUE_ID}`, status: 'draft', version: 1 };
  const service = {
    async getIssue(id) { calls.push(['getIssue', id]); return issue; },
    async reviseIssue(input) { calls.push(['reviseIssue', input]); return { ...issue, version: 2 }; },
  };
  const api = await startApi(service);
  t.after(api.close);

  const read = await request(api.baseUrl, 'GET', `/api/admin/editorial/issues/${ISSUE_ID}`);
  const revised = await request(api.baseUrl, 'PATCH', `/api/admin/editorial/issues/${ISSUE_ID}`, revisionBody());

  assert.equal(read.status, 200);
  assert.equal(revised.status, 200);
  assert.equal(revised.body.issue.version, 2);
  assert.equal(calls[1][1].actorUserId, ACTOR_ID);
  assert.equal(calls[1][1].expectedVersion, 1);
});

test('EDITORIAL-DRAFT-API-003: malformed issue IDs fail before repository access', async (t) => {
  let called = false;
  const service = { async getIssue() { called = true; } };
  const api = await startApi(service);
  t.after(api.close);

  const response = await request(api.baseUrl, 'GET', '/api/admin/editorial/issues/not-a-uuid');

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

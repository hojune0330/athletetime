const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ACTOR_ID,
  ISSUE_ID,
  SOURCE_ID,
  createFakeService,
  issueBody,
  request,
  startApi,
} = require('./helpers/communityEditorialApiHarness');

test('EDITORIAL-API-004: source CRUD and every workflow action carry actor and version', async (t) => {
  const service = createFakeService();
  const api = await startApi(service);
  t.after(api.close);
  const headers = { 'X-Test-Role': 'admin' };
  const source = {
    expectedVersion: 1,
    sourceUrl: 'https://example.com/results.pdf',
    sourceKind: 'official',
    title: 'Official results',
  };
  assert.equal((await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${ISSUE_ID}/sources`, {
    headers, body: source,
  })).status, 201);
  assert.equal((await request(
    api.baseUrl, 'PATCH', `/api/admin/editorial/issues/${ISSUE_ID}/sources/${SOURCE_ID}`,
    { headers, body: { ...source, expectedVersion: 2 } },
  )).status, 200);
  assert.equal((await request(
    api.baseUrl, 'DELETE', `/api/admin/editorial/issues/${ISSUE_ID}/sources/${SOURCE_ID}`,
    { headers, body: { expectedVersion: 3 } },
  )).status, 200);

  const actions = ['check', 'approve', 'reject', 'schedule', 'cancel', 'publish', 'correct', 'unpublish'];
  for (const action of actions) {
    const body = action === 'schedule'
      ? { expectedVersion: 4, scheduledFor: '2026-08-01T00:00:00.000Z' }
      : action === 'correct'
        ? {
          expectedVersion: 4,
          title: issueBody().title,
          content: issueBody().content,
          summary: issueBody().summary,
          whyNow: issueBody().whyNow,
          discussionQuestion: issueBody().discussionQuestion,
          relatedUrl: issueBody().relatedUrl,
          subjectAgeGroup: issueBody().subjectAgeGroup,
          reviewNote: 'Corrected source value',
        }
        : { expectedVersion: 4, ...(action === 'reject' || action === 'cancel' ? { note: 'Closed' } : {}) };
    const response = await request(
      api.baseUrl, 'POST', `/api/admin/editorial/issues/${ISSUE_ID}/${action}`, { headers, body },
    );
    assert.equal(response.status, 200, action);
  }

  for (const [name, input] of service.calls) {
    if (name === 'createIssue') continue;
    assert.equal(input.actorUserId, ACTOR_ID, name);
    assert.ok(Number.isInteger(input.expectedVersion), name);
  }
});

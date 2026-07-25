const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ISSUE_ID,
  createFakeService,
  request,
  startApi,
} = require('./helpers/communityEditorialApiHarness');

const RETRY_PATH = `/api/admin/editorial/issues/${ISSUE_ID}/retry-publish`;
const RETRY_BODY = {
  expectedVersion: 1,
  scheduledFor: '2026-08-01T00:10:00.000Z',
  note: '출처 확인을 마쳐 다시 예약합니다.',
};

function adminHeaders() {
  return {
    'X-Test-Role': 'admin',
    Cookie: 'athletetime_access=x; athletetime_csrf=csrf',
    'X-CSRF-Token': 'csrf',
  };
}

test('EDITORIAL-SCHEDULER-API-001: Given a retry request When it is not an authenticated administrator Then no retry reaches the service', async (t) => {
  // Given
  const service = createFakeService();
  const api = await startApi(service);
  t.after(api.close);

  // When
  const anonymous = await request(api.baseUrl, 'POST', RETRY_PATH, { body: RETRY_BODY });
  const member = await request(api.baseUrl, 'POST', RETRY_PATH, {
    headers: { 'X-Test-Role': 'user' },
    body: RETRY_BODY,
  });
  const missingCsrf = await request(api.baseUrl, 'POST', RETRY_PATH, {
    headers: { 'X-Test-Role': 'admin', Cookie: 'athletetime_access=x; athletetime_csrf=csrf' },
    body: RETRY_BODY,
  });

  // Then
  assert.equal(anonymous.status, 401);
  assert.equal(member.status, 403);
  assert.equal(missingCsrf.status, 403);
  assert.equal(service.calls.some(([name]) => name === 'retryPublish'), false);
});

test('EDITORIAL-SCHEDULER-API-002: Given a stale issue version When an administrator retries Then the server rejects without a successful retry', async (t) => {
  // Given
  const service = createFakeService();
  service.retryPublish = async () => {
    const error = new Error('The issue was changed by another administrator');
    error.code = 'EDITORIAL_VERSION_CONFLICT';
    error.status = 409;
    throw error;
  };
  const api = await startApi(service);
  t.after(api.close);

  // When
  const response = await request(api.baseUrl, 'POST', RETRY_PATH, {
    headers: adminHeaders(),
    body: { ...RETRY_BODY, expectedVersion: 99 },
  });

  // Then
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'EDITORIAL_VERSION_CONFLICT');
  assert.equal(service.calls.some(([name]) => name === 'retryPublish'), false);
});

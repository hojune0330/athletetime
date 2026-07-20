const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const { createEditorialAdminRouter } = require('../routes/editorialAdmin');
const {
  parseCalendarCreateBody,
  parseCalendarUpdateBody,
  parseIssueCreateBody,
  parseScheduleBody,
} = require('../../card-studio/services/editorialRequestParsers');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const CALENDAR_ID = '30000000-0000-4000-8000-000000000001';

function calendarBody() {
  return {
    seasonYear: 2026,
    sectionKey: 'competition-preview',
    slot: 1,
    scheduledFor: '2026-08-01T09:00:00.000Z',
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
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('EDITORIAL-CALENDAR-API-001: calendar payloads and schedules require exact ISO input', () => {
  assert.deepEqual(parseCalendarCreateBody(calendarBody()), calendarBody());
  assert.deepEqual(parseCalendarUpdateBody({
    expectedVersion: 1, scheduledFor: '2026-08-02T09:00:00Z',
  }), { expectedVersion: 1, scheduledFor: '2026-08-02T09:00:00.000Z' });
  for (const scheduledFor of [
    'July 20, 2026 12:00 UTC',
    '2026-08-01',
    '2026/08/01 09:00',
    '2026-02-31T00:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T00:00:00+14:30',
  ]) {
    assert.throws(() => parseScheduleBody({ expectedVersion: 1, scheduledFor }), /ISO/u);
  }
});

test('EDITORIAL-CALENDAR-API-003: an issue can explicitly claim one planned calendar version', () => {
  const input = {
    seasonYear: 2026,
    sectionKey: 'record-story',
    slot: 2,
    title: 'A record story',
    content: 'Source-backed result context.',
    author: '애타 편집팀',
    summary: 'A short summary.',
    whyNow: 'The result was published this week.',
    discussionQuestion: 'Which performance stood out?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    calendarId: CALENDAR_ID,
    expectedCalendarVersion: 1,
  };
  assert.deepEqual(parseIssueCreateBody(input), input);
  assert.throws(
    () => parseIssueCreateBody({ ...input, expectedCalendarVersion: undefined }),
    /calendarId and expectedCalendarVersion/u,
  );
});

test('EDITORIAL-CALENDAR-API-002: create, update, and cancel carry actor and version', async (t) => {
  const calls = [];
  const entry = { id: CALENDAR_ID, state: 'planned', version: 1, ...calendarBody() };
  const service = {
    async createCalendar(input) { calls.push(['create', input]); return entry; },
    async updateCalendar(input) { calls.push(['update', input]); return { ...entry, version: 2 }; },
    async cancelCalendar(input) { calls.push(['cancel', input]); return { ...entry, state: 'cancelled', version: 3 }; },
    async skipCalendar(input) { calls.push(['skip', input]); return { ...entry, state: 'skipped', version: 3 }; },
  };
  const api = await startApi(service);
  t.after(api.close);

  assert.equal((await request(api.baseUrl, 'POST', '/api/admin/editorial/calendar', calendarBody())).status, 201);
  assert.equal((await request(api.baseUrl, 'PATCH', `/api/admin/editorial/calendar/${CALENDAR_ID}`, {
    expectedVersion: 1, scheduledFor: '2026-08-02T09:00:00Z',
  })).status, 200);
  assert.equal((await request(api.baseUrl, 'DELETE', `/api/admin/editorial/calendar/${CALENDAR_ID}`, {
    expectedVersion: 2, note: 'No source-backed topic this week',
  })).status, 200);
  assert.equal((await request(api.baseUrl, 'POST', `/api/admin/editorial/calendar/${CALENDAR_ID}/skip`, {
    expectedVersion: 2, note: 'Candidate quality below threshold',
  })).status, 200);
  assert.deepEqual(calls.map(([name]) => name), ['create', 'update', 'cancel', 'skip']);
  assert.equal(calls.every(([, input]) => input.actorUserId === ACTOR_ID), true);
  assert.deepEqual(calls.slice(1).map(([, input]) => input.expectedVersion), [1, 2, 2]);
});

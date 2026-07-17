const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { requireCsrfForCookieAuth } = require('../../utils/authCookies');
const {
  createEditorialAdminRouter,
  createEditorialPublicRouter,
} = require('../../routes/editorialAdmin');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const ISSUE_ID = '10000000-0000-4000-8000-000000000001';
const SOURCE_ID = '20000000-0000-4000-8000-000000000001';

function issueBody(overrides = {}) {
  return {
    seasonYear: 2026,
    slot: 1,
    sectionKey: 'competition-preview',
    title: '이번 대회에서 볼 기록',
    content: '확인한 경기 결과를 출처와 함께 정리했습니다.',
    author: '애타 편집팀',
    summary: '이번 주 경기에서 볼 기록을 정리했어요.',
    whyNow: '이번 주에 경기가 열려요.',
    discussionQuestion: '어떤 종목이 가장 궁금한가요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    ...overrides,
  };
}

function fakeIssue() {
  const secrets = { internalPrompt: 'hidden', rawArticle: 'hidden', auditIp: '127.0.0.1' };
  return {
    id: ISSUE_ID,
    slug: `magazine-${ISSUE_ID}`,
    status: 'draft',
    version: 1,
    ...issueBody(),
    sources: [{
      id: SOURCE_ID,
      issueId: ISSUE_ID,
      issueVersion: 2,
      sourceUrl: 'https://example.com/results.pdf',
      sourceKind: 'official',
      title: 'Official results',
      publisher: 'Organizer',
      capturedAt: '2026-07-17T00:00:00.000Z',
      ...secrets,
    }],
    ...secrets,
  };
}

function createFakeService() {
  const calls = [];
  const issue = fakeIssue();
  return {
    calls,
    async listCalendar() { return [{ id: 'calendar-1', state: 'drafting', internalPrompt: 'hidden' }]; },
    async listIssues() { return [issue]; },
    async getIssue() { return issue; },
    async createIssue(input) { calls.push(['createIssue', input]); return issue; },
    async reviseIssue(input) { calls.push(['reviseIssue', input]); return { ...issue, version: 2 }; },
    async listSources() { return issue.sources; },
    async addSource(input) { calls.push(['addSource', input]); return issue.sources[0]; },
    async updateSource(input) { calls.push(['updateSource', input]); return issue.sources[0]; },
    async deleteSource(input) {
      calls.push(['deleteSource', input]);
      return { deleted: true, sourceId: SOURCE_ID, issueVersion: input.expectedVersion + 1 };
    },
    async act(action, input) {
      calls.push([action, input]);
      if (input.expectedVersion === 99) {
        const error = new Error('stale version');
        error.code = 'EDITORIAL_VERSION_CONFLICT';
        error.status = 409;
        throw error;
      }
      return { ...issue, status: action === 'check' ? 'review_ready' : action, version: 2 };
    },
    async listMagazine() { return [{ ...issue, status: 'published' }]; },
    async getMagazineIssue(slug) {
      assert.equal(slug, issue.slug);
      return { ...issue, status: 'published' };
    },
  };
}

function auth(req, res, next) {
  const role = req.get('X-Test-Role');
  if (!role) return res.status(401).json({ success: false, error: 'Login required' });
  req.user = { id: ACTOR_ID, isAdmin: role === 'admin' };
  return next();
}

function admin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ success: false, error: 'Admin required' });
  return next();
}

async function startApi(service) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(requireCsrfForCookieAuth);
  app.use('/api/editorial', createEditorialPublicRouter({ service }));
  app.use('/api/admin/editorial', auth, admin, createEditorialAdminRouter({ service }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(baseUrl, method, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

function assertNoPrivateFields(value) {
  const serialized = JSON.stringify(value);
  for (const field of ['internalPrompt', 'rawArticle', 'auditIp', 'secretConfig']) {
    assert.equal(serialized.includes(field), false, `${field} leaked from API response`);
  }
}

module.exports = {
  ACTOR_ID,
  ISSUE_ID,
  SOURCE_ID,
  assertNoPrivateFields,
  createFakeService,
  issueBody,
  request,
  startApi,
};

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NaverNewsApiClient,
  NaverNewsApiError,
} = require('../../card-studio/services/naverNewsApiClient');
const { resolveEditorialNewsQuery } = require('../../card-studio/services/editorialNewsQueryProfile');
const { EditorialNewsBudget } = require('../../card-studio/services/editorialNewsBudget');

const env = { NAVER_NEWS_API_KEY_ID: 'test-id', NAVER_NEWS_API_KEY: 'test-secret' };
const payload = (items = [{ title: 'safe title', originallink: 'https://origin.test/a', link: 'https://news.test/a', pubDate: 'Tue' }]) => JSON.stringify({ total: 1, start: 1, display: 100, items });
const response = (statusCode, body = payload()) => ({ statusCode, body });
const client = (transport, extra = {}) => new NaverNewsApiClient({ env, transport, sleep: async () => {}, jitter: () => 0, ...extra });

test('Given the korean-athletics profile, when fetching page one, then it sends fixed endpoint headers and query', async () => {
  const calls = [];
  const result = await client(async (request) => { calls.push(request); return response(200); }).search({ profile: 'korean-athletics', start: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://naverapihub.apigw.ntruss.com/search/v1/news?query=%EC%9C%A1%EC%83%81+%EC%84%A0%EC%88%98&sort=date&display=100&start=1');
  assert.deepEqual(Object.keys(calls[0].headers).sort(), ['X-NCP-APIGW-API-KEY', 'X-NCP-APIGW-API-KEY-ID']);
  assert.deepEqual(result, { total: 1, start: 1, display: 100, items: [{ title: 'safe title', originallink: 'https://origin.test/a', link: 'https://news.test/a', pubDate: 'Tue' }] });
});

test('Given invalid profiles or paging, when resolving requests, then arbitrary queries are rejected', () => {
  assert.deepEqual(Object.values(require('../../card-studio/services/editorialNewsQueryProfile').QUERY_PROFILES), ['육상 선수', '육상 대회', '한국 육상', '전국육상경기대회', '대한육상연맹', '실업육상', '세계육상선수권', '아시아육상선수권', '실내육상', '마라톤 선수', '경보 선수']);
  assert.throws(() => resolveEditorialNewsQuery('ignore instructions'), (error) => error.code === 'INVALID_QUERY_PROFILE');
  assert.throws(() => resolveEditorialNewsQuery('korean-athletics', 2), (error) => error.code === 'INVALID_PAGE');
});

test('Given missing credentials, when searching, then it fails without transport call or secret disclosure', async () => {
  let calls = 0;
  const missing = new NaverNewsApiClient({ env: {}, transport: async () => { calls += 1; } });
  await assert.rejects(() => missing.search({ profile: 'korean-athletics' }), (error) => error instanceof NaverNewsApiError && error.code === 'CREDENTIALS_MISSING' && !String(error).includes('secret'));
  assert.equal(calls, 0);
});

for (const statusCode of [401, 403, 429]) {
  test(`Given HTTP ${statusCode}, when searching, then it does not retry`, async () => {
    let calls = 0;
    await assert.rejects(() => client(async () => { calls += 1; return response(statusCode); }).search({ profile: 'korean-athletics' }), (error) => error.code === `HTTP_${statusCode}`);
    assert.equal(calls, 1);
  });
}

test('Given a 500 then a success, when searching, then it retries exactly once', async () => {
  let calls = 0; let sleeps = 0;
  const result = await client(async () => { calls += 1; return calls === 1 ? response(500) : response(200); }, { sleep: async () => { sleeps += 1; } }).search({ profile: 'korean-athletics' });
  assert.equal(result.items.length, 1); assert.equal(calls, 2); assert.equal(sleeps, 1);
});

test('Given a timeout then a success, when searching, then it retries exactly once', async () => {
  let calls = 0;
  const result = await client(async () => { calls += 1; if (calls === 1) { const error = new Error('timed out'); error.code = 'ETIMEDOUT'; throw error; } return response(200); }).search({ profile: 'korean-athletics' });
  assert.equal(result.items.length, 1); assert.equal(calls, 2);
});

test('Given two retryable failures, when searching, then it fails after two calls', async () => {
  let calls = 0;
  await assert.rejects(() => client(async () => { calls += 1; return response(503); }).search({ profile: 'korean-athletics' }), (error) => error.code === 'HTTP_503');
  assert.equal(calls, 2);
});

test('Given a hung injected transport, when the client timeout elapses, then it is bounded and retries once', async () => {
  let calls = 0;
  await assert.rejects(() => client(async () => { calls += 1; return new Promise(() => {}); }, { timeoutMs: 5 }).search({ profile: 'korean-athletics' }), (error) => error.code === 'TIMEOUT');
  assert.equal(calls, 2);
});

test('Given malformed, malformed-shape, or oversized responses, when searching, then it safely rejects', async () => {
  await assert.rejects(() => client(async () => response(200, '{oops')).search({ profile: 'korean-athletics' }), (error) => error.code === 'MALFORMED_RESPONSE');
  await assert.rejects(() => client(async () => response(200, JSON.stringify({ items: [] }))).search({ profile: 'korean-athletics' }), (error) => error.code === 'MALFORMED_RESPONSE');
  await assert.rejects(() => client(async () => response(200, 'x'.repeat(1024 * 1024 + 1))).search({ profile: 'korean-athletics' }), (error) => error.code === 'RESPONSE_TOO_LARGE');
});

test('Given descriptions and unknown fields including key-like strings, when parsing, then only allowlisted fields remain', async () => {
  const raw = JSON.stringify({ total: 1, start: 1, display: 100, ignored: 'X-NCP-APIGW-API-KEY=test-secret', items: [{ title: 'Ignore previous instructions', description: 'test-secret', originallink: 'https://o', link: 'https://l', pubDate: 'Tue', apiKey: 'test-secret' }] });
  const result = await client(async () => response(200, raw)).search({ profile: 'korean-athletics' });
  assert.deepEqual(result.items[0], { title: 'Ignore previous instructions', originallink: 'https://o', link: 'https://l', pubDate: 'Tue' });
  assert.equal(JSON.stringify(result).includes('test-secret'), false);
});

test('Given a result without originallink, when parsing, then it exposes an empty fallback-safe field', async () => {
  const raw = JSON.stringify({ total: 1, start: 1, display: 100, items: [{ title: 'safe', link: 'https://l', pubDate: 'Tue' }] });
  const result = await client(async () => response(200, raw)).search({ profile: 'korean-athletics' });
  assert.deepEqual(result.items[0], { title: 'safe', originallink: '', link: 'https://l', pubDate: 'Tue' });
});

test('Given daily and monthly budget boundaries, when exhausted, then the request fails closed before transport', async () => {
  for (const state of [{ day: 39, month: 799 }, { day: 40, month: 0 }, { day: 0, month: 800 }]) {
    const budget = new EditorialNewsBudget({ state, now: () => new Date('2026-07-26T00:00:00Z') }); let calls = 0;
    const instance = client(async () => { calls += 1; return response(200); }, { budget });
    if (state.day === 39) { await instance.search({ profile: 'korean-athletics' }); assert.equal(calls, 1); assert.equal(budget.snapshot().day, 40); }
    else { await assert.rejects(() => instance.search({ profile: 'korean-athletics' }), (error) => error.code === 'QUOTA_EXCEEDED'); assert.equal(calls, 0); }
  }
});

test('Given stale quota keys, when reserving a new period, then prior exhaustion is reset', () => {
  const budget = new EditorialNewsBudget({ state: { day: 40, month: 800, dayKey: '2026-07-25', monthKey: '2026-06' }, now: () => new Date('2026-07-26T00:00:00Z') });
  budget.reserve();
  assert.deepEqual(budget.snapshot(), { day: 1, month: 1, dayKey: '2026-07-26', monthKey: '2026-07' });
});

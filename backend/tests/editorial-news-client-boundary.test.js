const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { NaverNewsApiClient } = require('../../card-studio/services/naverNewsApiClient');
const {
  classifyEditorialNewsRelevance,
  normalizeNaverNewsItem,
} = require('../../card-studio/services/editorialNewsNormalizer');

const ROOT = path.join(__dirname, '..', '..');

function readTree(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? readTree(entryPath) : fs.readFileSync(entryPath, 'utf8');
  }).join('\n');
}

test('NEWS-CLIENT-BOUNDARY-001: raw search results become persistence-safe discovery metadata', async () => {
  const secret = 'never-leak-client-secret';
  const rawResponse = JSON.stringify({
    total: 1,
    start: 1,
    display: 100,
    items: [{
      title: '<b>\uc721\uc0c1</b> \uc120\uc218\uad8c \uc77c\uc815',
      originallink: 'https://example.com/news/?utm_source=naver&id=1#top',
      link: 'https://news.naver.com/article/001/1',
      pubDate: 'Mon, 20 Jul 2026 03:04:05 +0000',
      description: `article summary ${secret}`,
      apiKey: secret,
    }],
  });
  const client = new NaverNewsApiClient({
    env: {
      NAVER_NEWS_COLLECTOR_ENABLED: 'true',
      NAVER_API_HUB_KEY_ID: 'test-id',
      NAVER_API_HUB_KEY: secret,
    },
    transport: async () => ({ statusCode: 200, body: rawResponse }),
  });

  const response = await client.search({ profile: 'korean-athletics' });
  const normalized = normalizeNaverNewsItem(response.items[0]);
  const relevance = classifyEditorialNewsRelevance(['korean-athletics'], normalized.title);
  const persistencePayload = { ...normalized, ...relevance, queryKeys: ['korean-athletics'] };

  assert.deepEqual(Object.keys(persistencePayload).sort(), [
    'canonicalUrlHash',
    'naverUrl',
    'originalUrl',
    'publishedAt',
    'queryKeys',
    'relevanceScore',
    'relevanceTags',
    'title',
  ]);
  assert.equal(persistencePayload.originalUrl, 'https://example.com/news?id=1');
  assert.equal(persistencePayload.title, '\uc721\uc0c1 \uc120\uc218\uad8c \uc77c\uc815');
  assert.doesNotMatch(JSON.stringify(persistencePayload), /description|apiKey|article summary|never-leak/iu);
});

test('NEWS-CLIENT-BOUNDARY-002: frontend source cannot contain server credential names', () => {
  const frontendSource = readTree(path.join(ROOT, 'frontend', 'src'));

  assert.doesNotMatch(frontendSource, /NAVER_API_HUB_KEY(?:_ID)?/u);
  assert.doesNotMatch(frontendSource, /X-NCP-APIGW-API-KEY(?:-ID)?/u);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');

const analytics = require('../../card-studio/services/recordAnalyticsService');
const recordAnalyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');
const teamStatistics = require('../../card-studio/services/teamStatisticsService');

test('Given a mixed team with an unclassified majority When category is omitted Then search and detail totals agree', () => {
  // Given two university rows and three rows whose category evidence is insufficient.
  const records = [
    ...['u1', 'u2'].map((id, index) => teamRecord(id, 'university', `university-${index}`)),
    ...['x1', 'x2', 'x3'].map((id, index) => teamRecord(id, 'general', `unclassified-${index}`)),
  ];
  const context = { records, normalizeTeam: (value) => String(value || '').trim() };
  const searchSummary = teamStatistics.search(context, '혼합대표', 20)[0];

  // When the neutral card destination requests the complete indexed period without a category.
  const detail = teamStatistics.getDetail(context, searchSummary.teamKey, { scope: 'all' });

  // Then no inferred primary category removes the majority of the search result.
  assert.equal(searchSummary.selectedCategory, null);
  assert.equal(searchSummary.resultCount, 5);
  assert.equal(detail.identity.selectedCategory, null);
  assert.equal(detail.summary.resultCount, searchSummary.resultCount);
  assert.equal(detail.summary.athleteCount, searchSummary.athleteCount);
});

test('Given a category-filtered team search When one team is opened Then search and detail totals agree', () => {
  // Given team records filtered to the corporate category.
  const teams = analytics.searchTeamStatistics('진도', 20, { category: 'corporate' });
  const searchSummary = teams.find((team) => team.teamLabel === '진도군청');
  assert.ok(searchSummary);

  // When the same public team key is opened for the full indexed period.
  const detail = analytics.getTeamStatistics(searchSummary.teamKey, {
    category: 'corporate',
    scope: 'all',
  });

  // Then both surfaces use the same bounded category aggregate without athlete rows.
  assert.equal(searchSummary.selectedCategory, 'corporate');
  assert.equal(detail.identity.selectedCategory, 'corporate');
  assert.equal(detail.summary.resultCount, searchSummary.resultCount);
  assert.equal(detail.summary.athleteCount, searchSummary.athleteCount);
  assert.equal(detail.summary.competitionCount, searchSummary.competitionCount);
  assert.equal(detail.summary.confirmedPodiumCount, searchSummary.confirmedPodiumCount);
  assert.equal(detail.summary.indexedImprovementCount, searchSummary.indexedImprovementCount);
  assert.equal(hasForbiddenKey(detail, TEAM_PRIVATE_KEYS), false);
});

test('Given a team with several seasons When latest scope is opened Then only its latest confirmed season is summarized', () => {
  // Given a known team and its complete category aggregate.
  const team = analytics.searchTeamStatistics('진도군청', 5, { category: 'corporate' })[0];
  const all = analytics.getTeamStatistics(team.teamKey, { category: 'corporate', scope: 'all' });

  // When the default latest-season detail is requested.
  const latest = analytics.getTeamStatistics(team.teamKey, { category: 'corporate', scope: 'latest' });

  // Then its applied season, rows, and trend are limited without changing team identity.
  assert.equal(latest.identity.teamKey, all.identity.teamKey);
  assert.equal(latest.coverage.appliedScope, 'latest');
  assert.equal(latest.coverage.appliedSeason, all.coverage.latestSeason);
  assert.deepEqual(latest.coverage.availableSeasons, all.coverage.availableSeasons);
  assert.ok(latest.coverage.availableSeasons.length > 1);
  assert.ok(latest.summary.resultCount <= all.summary.resultCount);
  assert.deepEqual(latest.seasonTrend.map((item) => item.season), [all.coverage.latestSeason]);
});

test('Given standard and manual steeplechase records When team events are grouped Then 3000mSC appears once', () => {
  // Given one team whose public records contain both ingestion paths.
  const team = analytics.searchTeamStatistics('진도군청', 5, { category: 'corporate' })[0];

  // When the full team event breakdown is built.
  const detail = analytics.getTeamStatistics(team.teamKey, { category: 'corporate', scope: 'all' });
  const steeplechase = detail.eventBreakdown.filter((item) => item.eventLabel === '3000mSC');

  // Then the same physical event has one canonical key and one aggregate row.
  assert.deepEqual(
    steeplechase.map((item) => item.eventKey),
    ['3000m-steeplechase'],
  );
});

test('Given manual top records from different competitions When participation is grouped Then dates stay with their competition', () => {
  // Given a team with manual top records collected from several overseas and domestic meets.
  const team = analytics.searchTeamStatistics('진도군청', 5, { category: 'corporate' })[0];

  // When its full participation list is built.
  const detail = analytics.getTeamStatistics(team.teamKey, { category: 'corporate', scope: 'all' });
  const distanceChallenge = detail.participation.find((item) => item.competitionName.includes('디스턴스'));

  // Then the 2025 meet keeps its own 2025 date instead of the batch's latest date.
  assert.ok(distanceChallenge);
  assert.equal(distanceChallenge.latestDate, '2025-07-19');
});

test('Given invalid team API inputs When they reach the route Then they fail closed with stable codes', async (t) => {
  const server = await startServer();
  t.after(server.close);

  // Given unsupported category, excessive limit, malformed key, and impossible season values.
  // When each value reaches the public API boundary.
  const invalidCategory = await getJson(server.baseUrl, '/teams/search?q=진도&category=elite');
  const excessiveLimit = await getJson(server.baseUrl, '/teams/search?q=진도&limit=31');
  const invalidKey = await getJson(server.baseUrl, '/teams/not-a-team-key');
  const invalidSeason = await getJson(server.baseUrl, '/teams/0000000000000000?season=1800');
  const missingTeam = await getJson(server.baseUrl, '/teams/0000000000000000?scope=all');

  // Then no invalid value is silently coerced and a valid-but-missing key remains a 404.
  assert.deepEqual(
    [invalidCategory, excessiveLimit, invalidKey, invalidSeason, missingTeam]
      .map(({ status, body }) => [status, body.code]),
    [
      [400, 'INVALID_TEAM_CATEGORY'],
      [400, 'INVALID_TEAM_LIMIT'],
      [400, 'INVALID_TEAM_KEY'],
      [400, 'INVALID_TEAM_SEASON'],
      [404, 'TEAM_NOT_FOUND'],
    ],
  );
});

test('Given a valid team detail request When it is served Then it is briefly cacheable and contains no raw athlete rows', async (t) => {
  const team = analytics.searchTeamStatistics('진도군청', 5, { category: 'corporate' })[0];
  const server = await startServer();
  t.after(server.close);

  // Given a team key obtained from the bounded public search.
  // When its latest corporate summary is requested through HTTP.
  const response = await getJson(
    server.baseUrl,
    `/teams/${team.teamKey}?category=corporate&scope=latest`,
  );

  // Then only aggregate sections are returned under a short public cache policy.
  assert.equal(response.status, 200);
  assert.equal(response.body.contractVersion, 1);
  assert.match(response.headers['cache-control'], /max-age=60/);
  assert.equal(response.body.data.identity.teamLabel, '진도군청');
  assert.equal(hasForbiddenKey(response.body.data, TEAM_PRIVATE_KEYS), false);
});

test('Given a valid category search When it is served Then the frontend contract version is explicit', async (t) => {
  const server = await startServer();
  t.after(server.close);

  // Given the bounded team search endpoint.
  // When a valid corporate-team query is requested.
  const response = await getJson(server.baseUrl, '/teams/search?q=진도&category=corporate&limit=20');

  // Then clients can reject older response shapes before rendering them.
  assert.equal(response.status, 200);
  assert.equal(response.body.contractVersion, 1);
  assert.ok(response.body.data.length > 0);
  assert.equal(hasForbiddenKey(response.body.data, TEAM_PRIVATE_KEYS), false);
});

test('Given an internal team service failure When the public routes respond Then implementation details stay private', async (t) => {
  // Given both public team service calls fail with a sensitive internal detail.
  const originalSearch = analytics.searchTeamStatistics;
  const originalDetail = analytics.getTeamStatistics;
  const secret = 'SECRET_INTERNAL_PATH C:/private/raw-results.xlsx';
  analytics.searchTeamStatistics = () => { throw new Error(secret); };
  analytics.getTeamStatistics = () => { throw new Error(secret); };
  t.after(() => {
    analytics.searchTeamStatistics = originalSearch;
    analytics.getTeamStatistics = originalDetail;
  });
  const server = await startServer();
  t.after(server.close);

  // When unauthenticated callers reach search and detail routes.
  const search = await getJson(server.baseUrl, '/teams/search?q=진도');
  const detail = await getJson(server.baseUrl, '/teams/0000000000000000?scope=all');

  // Then both responses use one stable generic error and reveal no service message.
  for (const response of [search, detail]) {
    assert.equal(response.status, 500);
    assert.equal(response.body.code, 'INTERNAL_ERROR');
    assert.equal(response.body.error, '팀 통계를 불러오지 못했어요.');
    assert.doesNotMatch(JSON.stringify(response.body), /SECRET_INTERNAL_PATH|private|xlsx/u);
  }
});

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(recordAnalyticsRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function getJson(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.json(),
  };
}

function hasForbiddenKey(value, forbidden) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, forbidden));
  return Object.entries(value).some(([key, child]) => forbidden.has(key) || hasForbiddenKey(child, forbidden));
}

const TEAM_PRIVATE_KEYS = new Set([
  'affiliations',
  'athleteKey',
  'athleteKeys',
  'attachment',
  'eventStats',
  'name',
  'note',
  'performance',
  'rankCounts',
  'records',
  'seasonStats',
  'workspace',
]);

function teamRecord(id, divisionLevel, competitionId) {
  return {
    id,
    team: '혼합대표',
    athleteKey: `athlete-${id}`,
    divisionLevel,
    season: 2025,
    competitionId,
    competitionName: competitionId,
    eventKey: '100m',
    eventLabel: '100m',
    rank: 4,
    phase: 'final',
    date: '2025-06-01',
    source: {},
  };
}

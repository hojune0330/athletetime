const assert = require('node:assert/strict');
const test = require('node:test');
const zlib = require('node:zlib');
const express = require('express');

const analytics = require('../../card-studio/services/recordAnalyticsService');
const divisionHierarchy = require('../../card-studio/services/divisionHierarchyService');
const analyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');
const { getSearchResults, makeWorkspacePreview } = require('./records-flow-e2e-data');

const FORBIDDEN_AVAILABILITY_KEYS = new Set([
  'athleteCount',
  'recordCount',
  'rowCount',
  'records',
  'roster',
]);

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      keys.add(key);
      collectKeys(child, keys);
    });
  }
  return keys;
}

async function startAnalyticsServer(t) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(analyticsRoutes);
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('Given explicit and unproven gender labels When divisions are normalized Then only explicit mixed evidence is called mixed', () => {
  const menOnly = analytics.normalizeEvent('남자 100m 결승', '남자부');
  const unknownHigh = analytics.normalizeEvent('100m 결승', '고 1학년부');
  const unknownMiddle = analytics.normalizeEvent('100m 결승', '중 1학년부');
  const ambiguousComposite = analytics.normalizeEvent('100m 결승', '남초,여초');
  const explicitMixed = analytics.normalizeEvent('100m 결승', '혼성 초등부');

  assert.deepEqual(
    [menOnly.divisionKey, unknownHigh.divisionKey, unknownMiddle.divisionKey, ambiguousComposite.divisionKey, explicitMixed.divisionKey],
    ['men-unspecified', 'unknown-high', 'unknown-middle', 'unknown-elementary', 'mixed-elementary'],
  );
  assert.equal(menOnly.divisionLabel, '남자 (세부부문 없음)');
  assert.equal(unknownHigh.divisionLabel, '고등부 (성별 구분 없음)');
  assert.equal(unknownMiddle.divisionLabel, '중학부 (성별 구분 없음)');
  assert.equal(ambiguousComposite.divisionLabel, '초등부 (성별 구분 없음)');
  assert.equal(explicitMixed.divisionLabel, '혼성 초등부');
  assert.equal(explicitMixed.gender, 'mixed');
});

test('Given the public filter contract When filters are requested Then availability is loaded separately', () => {
  const filters = analytics.getFilters();
  assert.equal(Object.prototype.hasOwnProperty.call(filters, 'availableSeasonCombinations'), false);
  assert.equal(typeof analytics.getSeasonAvailability, 'function');
});

test('Given the fixture search boundary When Beta, no-match, and empty queries run Then each observable state stays distinct', () => {
  assert.deepEqual(getSearchResults('Beta').map((candidate) => candidate.athleteKey), ['beta-2016']);
  assert.deepEqual(getSearchResults('no such athlete'), []);
  assert.deepEqual(getSearchResults('   '), []);
});

test('Given canonical and unavailable workspace fixture keys When a preview is built Then resolved subjects retain requested-to-canonical mapping', () => {
  const preview = makeWorkspacePreview(['alpha-2016', 'aaaaaaaaaaaaaaaa', 'missing-key']);

  assert.deepEqual(preview.resolvedSubjectKeys, [
    { requestedSubjectKey: 'alpha-2016', athleteKey: 'alpha-2016' },
    { requestedSubjectKey: 'aaaaaaaaaaaaaaaa', athleteKey: 'aaaaaaaaaaaaaaaa' },
  ]);
  assert.deepEqual(preview.unavailableSubjectKeys, ['missing-key']);
});

test('Given the real public index When availability is projected Then it is deterministic, count-free, and level-specific', () => {
  const filters = analytics.getFilters();
  const availability = analytics.getSeasonAvailability();
  const seasonEntries = Object.entries(availability.seasons);

  assert.deepEqual(availability, analytics.getSeasonAvailability());
  assert.ok(seasonEntries.length > 0);
  assert.deepEqual(Object.keys(availability), ['seasons']);
  for (const key of collectKeys(availability)) {
    assert.equal(FORBIDDEN_AVAILABILITY_KEYS.has(key), false, `availability key ${key} is private or count-bearing`);
  }

  const seasons = new Set(filters.seasons.map(String));
  const eventOrder = new Map(filters.events.map((event, index) => [event.key, index]));
  const divisionOrder = new Map(filters.divisions.map((division, index) => [division.key, index]));
  for (const [season, events] of seasonEntries) {
    assert.match(season, /^(?:19|20)\d{2}$/u);
    assert.equal(seasons.has(season), true);
    const eventEntries = Object.entries(events);
    assert.ok(eventEntries.length > 0);
    assert.deepEqual(
      eventEntries.map(([eventKey]) => eventOrder.get(eventKey)),
      eventEntries.map(([eventKey]) => eventOrder.get(eventKey)).slice().sort((a, b) => a - b),
    );
    for (const [eventKey, divisionKeys] of eventEntries) {
      assert.equal(eventOrder.has(eventKey), true);
      assert.ok(divisionKeys.length > 0);
      assert.equal(new Set(divisionKeys).size, divisionKeys.length);
      assert.equal(divisionKeys.some((divisionKey) => divisionKey.endsWith('-all')), false);
      assert.deepEqual(
        divisionKeys.map((divisionKey) => divisionOrder.get(divisionKey)),
        divisionKeys.map((divisionKey) => divisionOrder.get(divisionKey)).slice().sort((a, b) => a - b),
      );
    }
  }
});

test('Given a query-free availability request When it is serialized Then it is cacheable and stays within both byte budgets', async (t) => {
  const baseUrl = await startAnalyticsServer(t);
  const response = await fetch(`${baseUrl}/season-availability`);
  const rawBody = await response.text();
  const body = JSON.parse(rawBody);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60, stale-while-revalidate=300');
  assert.equal(body.success, true);
  assert.equal(body.contractVersion, 2);
  assert.deepEqual(Object.keys(body.data), ['seasons']);
  assert.ok(Buffer.byteLength(rawBody) <= 100 * 1024);
  assert.ok(zlib.gzipSync(rawBody).byteLength <= 25 * 1024);
});

test('Given an unexpected availability query When the endpoint is requested Then it returns a typed 400', async (t) => {
  const baseUrl = await startAnalyticsServer(t);
  const response = await fetch(`${baseUrl}/season-availability?season=2026`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'INVALID_AVAILABILITY_QUERY',
    error: '시즌 가용성 요청에는 검색 조건을 사용할 수 없어요.',
  });
});

test('Given a canonical division key When athletes are searched Then filtering happens before the public result limit', async (t) => {
  const index = analytics.getIndex();
  const fixture = index.athletes.find((athlete) => (
    athlete.name.length >= 2 && athlete.records.some((record) => !record.divisionKey.endsWith('-all'))
  ));
  assert.ok(fixture);
  const divisionKey = fixture.records.find((record) => !record.divisionKey.endsWith('-all')).divisionKey;
  const baseUrl = await startAnalyticsServer(t);
  const response = await fetch(
    `${baseUrl}/records/search?q=${encodeURIComponent(fixture.name)}&divisionKey=${encodeURIComponent(divisionKey)}&limit=1`,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.length, 1);
  assert.equal(
    body.data.every((candidate) => index.athleteByKey.get(candidate.athleteKey)?.records.some((record) => record.divisionKey === divisionKey)),
    true,
  );
  assert.equal(JSON.stringify(body.data).includes('rawDivision'), false);
  assert.equal(JSON.stringify(body.data).includes('sourceDivisionLabel'), false);
});

test('Given malformed or rollup division keys When athletes are searched Then the requests return the same typed 400', async (t) => {
  const baseUrl = await startAnalyticsServer(t);
  const responses = await Promise.all([
    fetch(`${baseUrl}/records/search?q=가나&divisionKey=men-all`),
    fetch(`${baseUrl}/records/search?q=가나&divisionKey=men-high%00junk`),
    fetch(`${baseUrl}/records/search?q=가나&divisionKey=MEN-HIGH`),
  ]);

  assert.deepEqual(responses.map((response) => response.status), [400, 400, 400]);
  assert.deepEqual(await Promise.all(responses.map((response) => response.json())), [
    { success: false, code: 'INVALID_DIVISION_KEY', error: '지원하지 않는 경기 부문이에요.' },
    { success: false, code: 'INVALID_DIVISION_KEY', error: '지원하지 않는 경기 부문이에요.' },
    { success: false, code: 'INVALID_DIVISION_KEY', error: '지원하지 않는 경기 부문이에요.' },
  ]);
});

test('Given an ambiguous legacy athlete key When the profile route responds Then no candidate is selected', async (t) => {
  const original = analytics.getAthleteSummary;
  analytics.getAthleteSummary = () => ({
    ambiguity: 'multiple_candidates',
    candidates: [{ athleteKey: 'synthetic-a' }, { athleteKey: 'synthetic-b' }],
  });
  t.after(() => { analytics.getAthleteSummary = original; });
  const baseUrl = await startAnalyticsServer(t);
  const response = await fetch(`${baseUrl}/athletes/synthetic-legacy`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ambiguity, 'multiple_candidates');
  assert.deepEqual(body.data.candidates.map((candidate) => candidate.athleteKey), ['synthetic-a', 'synthetic-b']);
  assert.equal(Object.prototype.hasOwnProperty.call(body.data, 'athlete'), false);
});

test('Given internal source identifiers When public record and profile routes respond Then sourceId never crosses the HTTP boundary', async (t) => {
  const index = analytics.getIndex();
  const fixture = index.athletes.find((athlete) => athlete.records.length > 0);
  assert.ok(fixture);
  const selection = analytics.getFilters().defaultSeasonSelection;
  const params = new URLSearchParams({
    season: String(selection.season),
    eventKey: selection.eventKey,
    divisionKey: selection.divisionKey,
  });
  const baseUrl = await startAnalyticsServer(t);
  const [seasonResponse, profileResponse] = await Promise.all([
    fetch(`${baseUrl}/season-records?${params}`),
    fetch(`${baseUrl}/athletes/${encodeURIComponent(fixture.athleteKey)}`),
  ]);
  const [seasonBody, profileBody] = await Promise.all([
    seasonResponse.json(),
    profileResponse.json(),
  ]);

  assert.equal(seasonResponse.status, 200);
  assert.equal(profileResponse.status, 200);
  assert.ok(seasonBody.data.rows.length > 0);
  assert.ok(profileBody.data.records.length > 0);
  assert.equal(collectKeys(seasonBody.data).has('sourceId'), false);
  assert.equal(collectKeys(profileBody.data).has('sourceId'), false);
});

test('Given taxonomy and hostile upstream labels When public provenance is projected Then only short taxonomy labels survive', () => {
  assert.equal(divisionHierarchy.toPublicSourceDivisionLabel('남자 고등부'), '남자 고등부');
  assert.equal(divisionHierarchy.toPublicSourceDivisionLabel('고 1학년부'), '고 1학년부');
  assert.equal(divisionHierarchy.toPublicSourceDivisionLabel('남초,여초'), '남초,여초');
  for (const hostile of [
    ['남고'],
    '홍길동 남고',
    '남고 athlete@example.test',
    'https://example.test/남고',
    '남고 010-1234-5678',
    'athlete-opaque-12345',
    '남자 고등부 자유 입력 메모',
  ]) {
    assert.equal(divisionHierarchy.toPublicSourceDivisionLabel(hostile), null);
  }
});

test('Given indexed detail records When a public athlete profile is returned Then raw text is absent and safe provenance is nullable', () => {
  const index = analytics.getIndex();
  const fixture = index.athletes.find((athlete) => athlete.records.length > 0);
  assert.ok(fixture);
  const profile = analytics.getAthleteSummary(fixture.athleteKey);
  const serialized = JSON.stringify(profile);

  assert.equal(serialized.includes('rawDivision'), false);
  for (const record of profile.records) {
    assert.equal(Object.prototype.hasOwnProperty.call(record, 'sourceDivisionLabel'), true);
    assert.equal(
      record.sourceDivisionLabel === null || divisionHierarchy.toPublicSourceDivisionLabel(record.sourceDivisionLabel) === record.sourceDivisionLabel,
      true,
    );
  }

  const filters = analytics.getFilters();
  const table = analytics.getSeasonRecords(filters.defaultSeasonSelection);
  assert.ok(table.rows.length > 0);
  for (const row of table.rows) {
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'rawDivision'), false);
  }
  const candidate = analytics.searchAthletes(fixture.name, 1)[0];
  assert.ok(candidate);
  assert.equal(Object.prototype.hasOwnProperty.call(candidate, 'rawDivision'), false);
});

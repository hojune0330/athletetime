const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const resultsStore = require('../../card-studio/services/resultsStore');
const searchService = require('../../card-studio/services/searchService');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');

test('TRACK-A-SERVICE-001 promoted 2015 Yecheon result is available through resultsStore and competition search', () => {
  const filename = '2015__2015-track_field-0318.json';
  const raw = resultsStore.getRawByFilename(filename);
  assert.ok(raw);
  assert.equal(raw.meta.competition_name, '예천');
  assert.equal(raw.meta.year, '2015');
  assert.equal(raw.events.some((event) => event.event === '남자 100m 결승'), true);

  const search = searchService.search({ query: '김국영', competition: filename });
  assert.ok(search.totalMatches >= 1);
  assert.deepEqual(search.competitions, ['예천']);
  assert.equal(search.sections.some((section) => section.event === '100m'), true);
});

test('TRACK-A-SERVICE-002 promoted rows are searchable in athlete analytics as public result rows', () => {
  const results = recordAnalyticsService.searchAthletes('김국영', 10);
  const kim = results.find((result) => result.name === '김국영' && result.team === '광주광역시청');
  assert.ok(kim);

  const profile = recordAnalyticsService.getAthleteSummary(kim.athleteKey);
  const yecheon = profile.records.find((record) => (
    record.season === 2015
    && record.competitionName === '예천'
    && record.eventKey === '100m'
    && record.record === '10.45'
  ));

  assert.ok(yecheon);
  assert.equal(yecheon.source.sourceType, 'public_result');
});

test('TRACK-A-SERVICE-003 records page copy states partial 2015-2017 coverage without claiming full history', () => {
  const page = fs.readFileSync(path.join(ROOT, 'frontend', 'src', 'pages', 'RecordsPage.tsx'), 'utf8');

  assert.match(page, /2015-2017 일부 기록/);
  assert.doesNotMatch(page, /지금은 2018년 이후 기록/);
  assert.doesNotMatch(page, /2005년부터 오늘까지 모든 경기결과/);
});

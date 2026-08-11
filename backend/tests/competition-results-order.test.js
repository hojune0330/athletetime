const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const searchService = require('../../card-studio/services/searchService');
const resultsStore = require('../../card-studio/services/resultsStore');

const ROOT = path.join(__dirname, '..', '..');
const LIFE_SPORT_PATTERN = /\uC0DD\uD65C\uCCB4\uC721|\uB9C8\uC2A4\uD130\uC988|\uB300\uCD95\uC804|recordsport/i;

function sortDateFromPeriod(period) {
  const dates = String(period || '').match(/\d{4}-\d{2}-\d{2}/g) || [];
  return dates[dates.length - 1] || '';
}

function syntheticFilename(year, competition) {
  const id =
    competition.competitionId != null
      ? String(competition.competitionId)
      : competition.toCd || competition.competitionName || '';
  return `${year}__${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
}

function findLifeSportFixture() {
  const year = '2025';
  const file = path.join(ROOT, 'data', 'results', `${year}.json`);
  const competitions = JSON.parse(fs.readFileSync(file, 'utf8'));
  const competition = competitions.find((candidate) => LIFE_SPORT_PATTERN.test(candidate.competitionName));

  assert.ok(competition);
  return { year, competition };
}

function allStoredResults() {
  const resultDirectory = path.join(ROOT, 'data', 'results');
  return fs.readdirSync(resultDirectory)
    .filter((file) => /^\d{4}\.json$/u.test(file))
    .sort()
    .flatMap((file) => {
      const year = file.slice(0, 4);
      const competitions = JSON.parse(fs.readFileSync(path.join(resultDirectory, file), 'utf8'));
      return competitions.map((competition) => ({ year, competition }));
    });
}

test('result competitions are listed newest first for the results tab default', () => {
  const competitions = searchService.getCompetitions().filter((competition) => sortDateFromPeriod(competition.period));

  const dates = competitions.map((competition) => sortDateFromPeriod(competition.period));

  assert.ok(dates.length > 1);
  for (let index = 1; index < dates.length; index += 1) {
    assert.ok(dates[index - 1] >= dates[index], `${dates[index - 1]} should be >= ${dates[index]}`);
  }
});

test('result competitions public index excludes life-sport competitions', () => {
  const competitions = searchService.getCompetitions();
  const surfaced = competitions.filter((competition) => LIFE_SPORT_PATTERN.test(competition.competition));

  assert.ok(competitions.length > 1);
  assert.deepEqual(surfaced.map((competition) => competition.competition), []);
});

test('stored result bundles reconcile exactly with the public index and intentional life-sport exclusions', () => {
  const stored = allStoredResults();
  const storedFilenames = stored.map(({ year, competition }) => syntheticFilename(year, competition));
  const publicFilenames = resultsStore.listFilenames();
  const publicSet = new Set(publicFilenames);
  const excluded = stored.filter(({ year, competition }) => (
    !publicSet.has(syntheticFilename(year, competition))
  ));
  const resultIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'results', 'index.json'), 'utf8'));

  assert.equal(new Set(storedFilenames).size, storedFilenames.length, 'every stored competition needs one stable synthetic filename');
  assert.equal(publicFilenames.length + excluded.length, stored.length);
  assert.deepEqual(
    [...publicSet].filter((filename) => !storedFilenames.includes(filename)),
    [],
    'the public result index must never refer to a missing bundle',
  );
  assert.ok(excluded.length > 0, 'the retained life-sport boundary must be explicit');
  assert.ok(excluded.every(({ competition }) => LIFE_SPORT_PATTERN.test(competition.competitionName)));
  assert.equal(resultIndex.length, stored.length, 'the source index must list every stored result bundle');
});

test('life-sport result originals stay stored while public filename index excludes them', () => {
  const { year, competition } = findLifeSportFixture();
  const filename = syntheticFilename(year, competition);
  const resultEventsRoute = fs.readFileSync(path.join(ROOT, 'card-studio', 'routes', 'resultEventsRoute.js'), 'utf8');

  assert.ok(resultsStore.getRawByFilename(filename));
  assert.equal(resultsStore.isPublicResultFilename(filename), false);
  assert.equal(resultsStore.listFilenames().includes(filename), false);
  assert.match(resultEventsRoute, /resultsStore\.isPublicResultFilename\(filename\)/);
  assert.match(resultEventsRoute, /return resultsStore\.isPublicResultFilename\(filename\) \? data : null/);
  assert.match(resultEventsRoute, /status\(404\)/);
  assert.match(resultEventsRoute, /error: '대회 결과를 찾을 수 없습니다\.'/);
  assert.doesNotMatch(resultEventsRoute, /[�]|Ã|ë|寃곌낵|李얠쓣|\?놁/);
});

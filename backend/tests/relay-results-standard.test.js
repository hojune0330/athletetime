const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

test('Given stored relay result data When validating all years Then polluted relay rows are absent', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-relay-results.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /위반 0건/);
});

test('Given a contaminated Kolon relay event When source is not re-parsed Then public data is held for recheck', () => {
  const competitions = readJson('data/results/2026.json');
  const competition = competitions.find((item) => item.competitionId === '2026-road-005');
  assert.ok(competition, '2026 Kolon middle-school competition must exist');

  const relayEvent = competition.events.find((event) => event.event === '12 역전경기 1일차');
  assert.ok(relayEvent, 'relay event must exist');
  assert.equal(relayEvent.tableType, 'relay');
  assert.equal(relayEvent.resultsStatus, 'source_reverify_needed');
  assert.equal(relayEvent.qualityHold, true);
  assert.equal(relayEvent.qualityMessage, '기록 확인 중이에요');
  assert.ok(relayEvent.heldResultCount > 0);
  assert.deepEqual(relayEvent.results, []);
});

test('Given held relay events When backend exposes public results Then users receive hold copy instead of rows', () => {
  const routeSource = readText('card-studio/routes/resultEventsRoute.js');
  const storeSource = readText('card-studio/services/resultsStore.js');
  const qualitySource = readText('card-studio/services/relayResultQualityService.js');

  assert.match(routeSource, /qualityHold/);
  assert.match(routeSource, /qualityMessage/);
  assert.match(routeSource, /HOLD_MESSAGE/);
  assert.match(qualitySource, /기록 확인 중이에요/);
  assert.match(storeSource, /holdUnsafeResultEvents/);
});

test('Given a contaminated combined event When backend exposes public results Then numeric names are held for recheck', () => {
  const resultsStore = require('../../card-studio/services/resultsStore');
  const raw = resultsStore.getRawByFilename('2018__2018-track_field-001.json');
  assert.ok(raw, '2018 national category competition must be available');

  const combinedEvent = raw.events.find((event) => event.event === '13 10종경기 결승');
  assert.ok(combinedEvent, 'combined event must exist');
  assert.equal(combinedEvent.tableType, 'combined');
  assert.equal(combinedEvent.resultsStatus, 'source_reverify_needed');
  assert.equal(combinedEvent.qualityHold, true);
  assert.equal(combinedEvent.qualityMessage, '기록 확인 중이에요');
  assert.ok(combinedEvent.heldResultCount > 0);
  assert.deepEqual(combinedEvent.results, []);
});

test('Given a valid athlete with numeric military affiliation When filtering result quality Then the athlete remains searchable', () => {
  const { hasResultTextPollution } = require('../../card-studio/services/relayResultQualityService');

  assert.equal(
    hasResultTextPollution({ name: '심종섭', affiliation: '전라남도-제5295부대', record: '14:44.01' }),
    false,
  );
});

test('Given held relay events When searching records Then polluted runner strings are not indexed', () => {
  const searchSource = readText('card-studio/services/searchService.js');
  const qualitySource = readText('card-studio/services/relayResultQualityService.js');

  assert.match(searchSource, /isResultEventOnQualityHold/);
  assert.match(searchSource, /hasResultTextPollution/);
  assert.match(qualitySource, /TIME_IN_TEXT/);
  assert.match(qualitySource, /source_reverify_needed/);
});

test('Given a relay result table When scrapers parse it Then fixed track columns are bypassed', () => {
  for (const scraperPath of ['src/scraper.js', 'card-studio/scraper.js']) {
    const source = readText(scraperPath);
    const relayBranch = source.indexOf('parseRelayResultTable');
    const trackBranch = source.indexOf("tableType: 'track'");

    assert.ok(relayBranch >= 0, `${scraperPath} must include a relay parser`);
    assert.ok(trackBranch >= 0, `${scraperPath} must still include the track parser`);
    assert.ok(relayBranch < trackBranch, `${scraperPath} must check relay tables before track parsing`);
    assert.match(source, /resultsStatus: 'source_reverify_needed'/);
  }
});

test('Given held relay events When preparing source recheck Then a machine-readable blocker report is emitted', () => {
  const result = spawnSync(process.execPath, ['scripts/report-relay-reverify-holds.js', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);

  assert.equal(report.summary.publicHeldCompetitions, 25);
  assert.equal(report.summary.publicHeldEvents, 36);
  assert.equal(report.summary.publicHeldRows, 372);
  assert.equal(report.blocked.reason, 'source_files_or_dom_fixtures_required');
  assert.ok(
    report.items.some((item) => item.competitionId === '2026-road-005' && item.heldEvents.length >= 1),
    '2026 Kolon held relay events must be listed for source recheck',
  );
});

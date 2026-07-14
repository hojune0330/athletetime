const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');
const searchService = require('../../card-studio/services/searchService');
const compatibilitySearchService = require('../../src/services/searchService');
const insightService = require('../../card-studio/services/insightService');

function readResults(year) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'results', `${year}.json`), 'utf8'));
}

function allEvents(year) {
  return readResults(year).flatMap((competition) => competition.events || []);
}

function runReport(...args) {
  return spawnSync(process.execPath, ['scripts/report-public-index-quarantine.js', '--json', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('G003 keeps committed source rows intact while quarantining them from public indexes', () => {
  const relayRows = allEvents(2015)
    .flatMap((event) => event.results || [])
    .filter((row) => row.name === '정현석 김국영');
  const invalidEvents = allEvents(2016).filter((event) => event.event === '남자 박지현 결승');

  assert.ok(relayRows.length > 0, 'the committed concatenated relay name must remain in 2015.json');
  assert.ok(invalidEvents.length > 0, 'the committed person-like event must remain in 2016.json');
  assert.equal(recordAnalyticsService.searchAthletes('정현석 김국영').length, 0);
  assert.equal(recordAnalyticsService.getFilters().events.some((event) => /박지현/.test(event.label)), false);
  assert.equal(searchService.search({ query: '정현석 김국영' }).totalMatches, 0);
});

test('G003 treats relay rows as teams without suppressing their raw event tables', () => {
  const { assessPublicIndexRow, isRelayEvent } = require('../../card-studio/services/publicIndexQualityService');

  assert.equal(isRelayEvent('남자 4x100mR 결승'), true);
  assert.equal(isRelayEvent('여자 릴레이 결승'), true);
  assert.equal(isRelayEvent('코오롱 구간마라톤 역전경기'), true);
  assert.deepEqual(
    assessPublicIndexRow({ eventLabel: '남자 4x400mR 결승', row: { name: '광주시청' } }),
    { indexable: false, reason: 'team_event' },
  );

  const rawRelayEvent = allEvents(2015).find((event) => (
    event.event === '남자 4x100mR 결승'
    && (event.results || []).some((row) => row.name === '정현석 김국영')
  ));
  assert.ok(rawRelayEvent);
  assert.ok(rawRelayEvent.results.length > 0, 'the gate must not hide raw relay result tables');
});

test('G003 exposes only analytics event filters backed by indexed records', () => {
  const index = recordAnalyticsService.getIndex();
  const indexedEventKeys = new Set(index.records.map((record) => record.eventKey));
  const eventFilters = recordAnalyticsService.getFilters().events;

  assert.deepEqual(
    eventFilters.filter((event) => !indexedEventKeys.has(event.key)),
    [],
    'every public analytics event filter must have at least one indexed record',
  );
  assert.deepEqual(
    eventFilters.filter((event) => event.key.endsWith('-relay')),
    [],
    'relay-only filters must be absent after team rows are quarantined',
  );
});

test('G003 search audits traverse every loaded row through the public selection seam', () => {
  const target = {
    filename: 'audit.json',
    data: {
      meta: { competition_name: 'Audit competition' },
      events: [
        {
          event: '남자 100m 결승',
          results: [{ name: 'Legitimate Athlete', record: '10.00' }],
        },
        {
          event: '남자 4x100mR 결승',
          results: [
            { name: 'Relay Team One', record: '40.00' },
            { name: 'Relay Team Two', record: '41.00' },
          ],
        },
      ],
    },
  };

  for (const service of [searchService, compatibilitySearchService]) {
    const originalLoad = service._loadTargetData;
    const originalSelect = service._selectPublicSearchRows;
    service._loadTargetData = () => [target];
    service._selectPublicSearchRows = (event) => event.results || [];
    try {
      const audit = service.auditPublicIndexEligibility();
      assert.equal(audit.inspectedEvents, 2);
      assert.equal(audit.inspectedRows, 3);
      assert.equal(audit.selectedRows, 3);
      assert.equal(audit.quarantinedRows.length, 2);
      assert.deepEqual(audit.quarantinedRows.map((row) => row.name), [
        'Relay Team One',
        'Relay Team Two',
      ]);
    } finally {
      service._loadTargetData = originalLoad;
      service._selectPublicSearchRows = originalSelect;
    }
  }
});

test('G003 report detects recognized relay and zero-record analytics filters', () => {
  const { auditExposure } = require('../../scripts/report-public-index-quarantine');
  const emptyAudit = () => ({
    inspectedEvents: 0,
    inspectedRows: 0,
    selectedRows: 0,
    quarantinedRows: [],
  });
  const exposures = auditExposure({
    analyticsService: {
      getIndex: () => ({
        records: [{ eventKey: '100m', rawEvent: '남자 100m 결승', name: '선수' }],
      }),
      getFilters: () => ({
        events: [
          { key: '100m', label: '남자 100m 결승' },
          { key: 'relay', label: '남자 4x100mR 결승' },
          { key: 'orphan', label: '남자 200m 결승' },
        ],
      }),
    },
    currentSearchService: { auditPublicIndexEligibility: emptyAudit },
    compatibilitySearchService: { auditPublicIndexEligibility: emptyAudit },
    profileService: { auditPublicIndexEligibility: emptyAudit },
  });

  assert.equal(exposures.filters, 2);
});

test('G003 recognizes athletics events conservatively and preserves legitimate identities', () => {
  const { assessPublicIndexEvent } = require('../../card-studio/services/publicIndexQualityService');

  for (const label of [
    '남자 100m 결승',
    '여자 100mH 결승',
    '남자 3000mSC 결승',
    '여자 20kmW 결승',
    '남자 마라톤 결승',
    '여자 장대높이뛰기 결승',
    '남자 창던지기 결승',
    '남자 10종경기',
    '남자 4x100mR 결승',
  ]) {
    assert.deepEqual(assessPublicIndexEvent(label), { indexable: true, reason: null }, label);
  }
  assert.deepEqual(
    assessPublicIndexEvent('남자 박지현 결승'),
    { indexable: false, reason: 'unrecognized_event' },
  );

  assert.ok(recordAnalyticsService.searchAthletes('김국영').some((athlete) => athlete.name === '김국영'));
  assert.ok(
    recordAnalyticsService.searchAthletes('심종섭', 30).some((athlete) => (
      athlete.name === '심종섭' && athlete.team.includes('제5295부대')
    )),
    'numeric military affiliations must remain indexable',
  );

  const kim = recordAnalyticsService.searchAthletes('김국영', 30).find((athlete) => athlete.name === '김국영');
  const profile = recordAnalyticsService.getAthleteSummary(kim.athleteKey);
  assert.ok(profile.records.some((record) => record.source.sourceType === 'public_top_record_candidate'));
});

test('G003 quarantines relay and malformed-event rows from insight profiles', () => {
  assert.deepEqual(insightService.searchProfiles('정현석 김국영'), []);
  assert.equal(
    insightService.getAthleteProfiles().some((profile) => (
      profile.records.some((record) => record.event === '남자 박지현 결승')
    )),
    false,
  );
  assert.ok(
    insightService.searchProfiles('김국영').some((profile) => profile.name === '김국영'),
    'legitimate individual profiles must remain searchable',
  );
});

test('G003 report is deterministic, reasoned, read-only, and enforceable', () => {
  const before2015 = fs.readFileSync(path.join(ROOT, 'data', 'results', '2015.json'));
  const before2016 = fs.readFileSync(path.join(ROOT, 'data', 'results', '2016.json'));
  const first = runReport();
  const second = runReport();

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  const report = JSON.parse(first.stdout);
  assert.ok(report.quarantinedEventCount > 0);
  assert.ok(report.quarantinedRowCount > 0);
  assert.ok(report.reasons.unrecognized_event > 0);
  assert.ok(report.reasons.team_event > 0);
  assert.ok(report.samples.events.some((sample) => sample.event === '남자 박지현 결승'));
  assert.ok(report.samples.rows.some((sample) => sample.name === '정현석 김국영'));
  assert.ok(report.exposures.search.current);
  assert.ok(report.exposures.search.compatibility);
  assert.ok(report.exposures.insights);
  assert.equal(report.exposures.search.current.quarantinedRowCount, 0);
  assert.equal(report.exposures.search.compatibility.quarantinedRowCount, 0);
  assert.equal(report.exposures.insights.quarantinedRowCount, 0);
  assert.deepEqual(fs.readFileSync(path.join(ROOT, 'data', 'results', '2015.json')), before2015);
  assert.deepEqual(fs.readFileSync(path.join(ROOT, 'data', 'results', '2016.json')), before2016);

  const enforce = runReport('--enforce');
  assert.equal(enforce.status, 0, enforce.stderr || enforce.stdout);
  assert.equal(JSON.parse(enforce.stdout).exposureCount, 0);
});

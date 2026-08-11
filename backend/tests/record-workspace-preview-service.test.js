const assert = require('node:assert/strict');
const test = require('node:test');

const { createRecordWorkspacePreviewService } = require('../../card-studio/services/recordWorkspacePreviewService');

function recordFor({ id, athleteKey, name, team, date, season, sourceUrl = 'https://example.test/result', capturedAt = '2026-07-29T00:00:00.000Z' }) {
  return {
    id,
    athleteKey,
    name,
    team,
    season,
    competitionId: `competition-${season}`,
    competitionName: `대회 ${season}`,
    date,
    venue: '트랙',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-all',
    divisionLabel: '남자부',
    gender: 'men',
    divisionLevel: 'all',
    divisionDetail: null,
    rawDivision: '남자부',
    phase: 'final',
    recordDisplay: '10.50',
    recordValue: 10.5,
    direction: 'lower',
    rank: 1,
    wind: null,
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'KAAF',
      sourceType: 'public_result',
      sourceId: `source-${id}`,
      sourceUrl,
      capturedAt,
    },
  };
}

function athleteFor({ athleteKey, name, team, records }) {
  return {
    athleteKey,
    name,
    team,
    teams: [...new Set(records.map((record) => record.team))],
    years: [...new Set(records.map((record) => record.season))],
    events: [...new Set(records.map((record) => record.eventLabel))],
    divisions: [...new Set(records.map((record) => record.divisionLabel))],
    records,
  };
}

function createFixtureService(athletes) {
  const athleteByKey = new Map(athletes.map((athlete) => [athlete.athleteKey, athlete]));
  return createRecordWorkspacePreviewService({ getIndex: () => ({ athleteByKey }) });
}

test('Given visible records for two same-name public profiles When a workspace preview is requested Then it keeps profile boundaries and aggregates only visible records', () => {
  const firstRecords = [
    recordFor({ id: 'a-1', athleteKey: '1111111111111111', name: '가람', team: '서울고', date: '2025-06-02', season: 2025 }),
  ];
  const secondRecords = [
    recordFor({ id: 'b-1', athleteKey: '2222222222222222', name: '가람', team: '부산고', date: '2024-05-02', season: 2024 }),
  ];
  firstRecords[0].personNo = 'restricted-person-no';
  firstRecords[0].identityEvidence = { reason: 'internal-only' };
  const service = createFixtureService([
    athleteFor({ athleteKey: '1111111111111111', name: '가람', team: '서울고', records: firstRecords }),
    athleteFor({ athleteKey: '2222222222222222', name: '가람', team: '부산고', records: secondRecords }),
  ]);

  // Given two separately indexed public profiles with the same displayed name.
  // When the same profile key is repeated in a workspace preview request.
  const preview = service.getRecordWorkspacePreview({
    subjectKeys: ['1111111111111111', '2222222222222222', '1111111111111111'],
    limit: 50,
  });

  // Then the request is deduplicated without asserting that the profiles are one person.
  assert.equal(preview.subjects.length, 2);
  assert.deepEqual(preview.identity, {
    displayName: '가람',
    distinctNames: ['가람'],
    warning: 'same_name',
  });
  assert.equal(preview.coverage.totalMatched, 2);
  assert.equal(preview.records.length, 2);
  assert.deepEqual(preview.records.map((record) => record.athleteKey), ['1111111111111111', '2222222222222222']);
  assert.equal(JSON.stringify(preview).includes('restricted-person-no'), false);
  assert.equal(JSON.stringify(preview).includes('internal-only'), false);
  assert.equal(JSON.stringify(preview).includes('source-a-1'), false, 'internal source IDs never leave the public workspace DTO');
  assert.equal(preview.records[0].source.sourceUrl, 'https://example.test/result', 'the public source link remains available for provenance');
});

test('Given 125 visible records When each cursor page is requested Then date and id ordering yields every record exactly once', () => {
  const records = Array.from({ length: 125 }, (_, index) => recordFor({
    id: `record-${String(index).padStart(3, '0')}`,
    athleteKey: '3333333333333333',
    name: '나래',
    team: '인천고',
    date: `2025-06-${String(30 - Math.floor(index / 5)).padStart(2, '0')}`,
    season: 2025,
  }));
  const service = createFixtureService([
    athleteFor({ athleteKey: '3333333333333333', name: '나래', team: '인천고', records }),
  ]);

  // Given a visible index larger than the default page size.
  // When the client follows the opaque cursor through all pages.
  const first = service.getRecordWorkspacePreview({ subjectKeys: ['3333333333333333'], limit: 50 });
  const second = service.getRecordWorkspacePreview({ subjectKeys: ['3333333333333333'], cursor: first.coverage.nextCursor, limit: 50 });
  const third = service.getRecordWorkspacePreview({ subjectKeys: ['3333333333333333'], cursor: second.coverage.nextCursor, limit: 50 });

  // Then every visible record appears once and the final page closes the cursor.
  const returnedIds = [...first.records, ...second.records, ...third.records].map((record) => record.id);
  assert.equal(first.records.length, 50);
  assert.equal(second.records.length, 50);
  assert.equal(third.records.length, 25);
  assert.equal(new Set(returnedIds).size, 125);
  assert.equal(third.coverage.hasMore, false);
  assert.equal(third.coverage.nextCursor, null);
});

test('Given two visible affiliations in the latest observed season When a workspace preview is requested Then their status remains unresolved', () => {
  const records = [
    recordFor({ id: 'latest-a', athleteKey: '7777777777777777', name: '라온', team: '서울고', date: '2025-06-02', season: 2025 }),
    recordFor({ id: 'latest-b', athleteKey: '7777777777777777', name: '라온', team: '인천고', date: '2025-05-02', season: 2025 }),
    recordFor({ id: 'past-a', athleteKey: '7777777777777777', name: '라온', team: '대전중', date: '2024-05-02', season: 2024 }),
  ];
  const service = createFixtureService([
    athleteFor({ athleteKey: '7777777777777777', name: '라온', team: '서울고', records }),
  ]);

  // Given two separate affiliations observed during the same latest season.
  // When the public index is summarized without claiming a current affiliation.
  const preview = service.getRecordWorkspacePreview({ subjectKeys: ['7777777777777777'] });

  // Then both latest-season affiliations require review and earlier evidence stays historical.
  assert.deepEqual(preview.affiliations.map((affiliation) => affiliation.status), ['needs_review', 'needs_review', 'past_observed']);
});

test('Given a missing selected profile When other selected profiles remain visible Then the response reveals no unavailable-profile reason or stale label', () => {
  const records = [
    recordFor({ id: 'c-1', athleteKey: '4444444444444444', name: '다온', team: '대전고', date: '2025-05-02', season: 2025 }),
  ];
  const service = createFixtureService([
    athleteFor({ athleteKey: '4444444444444444', name: '다온', team: '대전고', records }),
  ]);

  // Given one visible key and one key that has no public index profile.
  // When both are requested together.
  const preview = service.getRecordWorkspacePreview({
    subjectKeys: ['4444444444444444', '5555555555555555'],
    limit: 50,
  });

  // Then only the unusable key is disclosed, without a label, reason, or hidden-record count.
  assert.deepEqual(preview.unavailableSubjectKeys, ['5555555555555555']);
  assert.equal(JSON.stringify(preview).includes('5555555555555555'), true);
  assert.equal(JSON.stringify(preview).includes('숨김'), false);
  assert.equal(JSON.stringify(preview).includes('처리 중'), false);
});

test('Given malformed workspace preview input When it reaches the service boundary Then it fails with the documented input code', () => {
  const service = createFixtureService([]);

  // Given an invalid seventh key, cursor, and page size.
  // When each malformed payload is parsed at the service boundary.
  const tooManyKeys = () => service.getRecordWorkspacePreview({ subjectKeys: Array(7).fill('6666666666666666') });
  const malformedCursor = () => service.getRecordWorkspacePreview({ subjectKeys: ['6666666666666666'], cursor: 'not-a-cursor' });
  const oversizedLimit = () => service.getRecordWorkspacePreview({ subjectKeys: ['6666666666666666'], limit: 101 });

  // Then callers receive typed documented failures instead of a partial or inferred result.
  assert.throws(tooManyKeys, { code: 'INVALID_SUBJECT_KEYS' });
  assert.throws(malformedCursor, { code: 'INVALID_CURSOR' });
  assert.throws(oversizedLimit, { code: 'LIMIT_OUT_OF_RANGE' });
});

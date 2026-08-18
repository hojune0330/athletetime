const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../../card-studio/services/recordAnalyticsService');
const identityResolver = require('../../card-studio/services/identityResolver');
const { createRecordWorkspacePreviewService } = require('../../card-studio/services/recordWorkspacePreviewService');
const { classifyRecord } = require('../../card-studio/services/teamCategoryService');

function recordFactKey(record) {
  return [
    record.source?.sourceType,
    record.name,
    record.team,
    record.competitionId,
    record.date,
    record.rawEvent,
    record.rank,
    record.recordDisplay,
  ].join('|');
}

test('Given an explicit male high-school division and school affiliation When normalized Then established taxonomy remains stable', () => {
  // Given
  const eventLabel = '남자 100m 결승';
  const divisionLabel = '남자고등학교부';

  // When
  const event = analytics.normalizeEvent(eventLabel, divisionLabel);
  const category = classifyRecord({ team: '서울체육고등학교' });

  // Then
  assert.equal(event.divisionKey, 'men-high');
  assert.equal(event.divisionLabel, '남자 고등부');
  assert.equal(category.category, 'high');
});

test('Given unproven and explicit mixed labels When normalized Then only explicit mixed evidence is called mixed', () => {
  // Given
  const labels = {
    combinedMarkers: '남초,여초',
    genericCombined: '통합부',
    explicitKorean: '혼성 초등부',
    explicitEnglish: 'Mixed U18',
    explicitCompactEnglish: 'MixedU18',
  };

  // When
  const normalized = Object.fromEntries(
    Object.entries(labels).map(([key, label]) => [key, analytics.normalizeEvent('100m 결승', label)]),
  );

  // Then
  assert.equal(normalized.combinedMarkers.gender, 'unknown');
  assert.equal(normalized.combinedMarkers.divisionLabel, '초등부 (성별 구분 없음)');
  assert.equal(normalized.genericCombined.gender, 'unknown');
  assert.equal(normalized.explicitKorean.gender, 'mixed');
  assert.equal(normalized.explicitEnglish.gender, 'mixed');
  assert.equal(normalized.explicitCompactEnglish.gender, 'mixed');
});

test('Given English event words beginning with M or W When no division is supplied Then gender remains unknown', () => {
  // Given
  const eventLabels = ['Marathon final', 'Mile final', 'Walk final', 'Walking final'];

  // When
  const events = eventLabels.map((eventLabel) => analytics.normalizeEvent(eventLabel, ''));

  // Then
  assert.deepEqual(events.map((event) => event.gender), ['unknown', 'unknown', 'unknown', 'unknown']);
  assert.deepEqual(events.map((event) => event.divisionKey), [
    'unknown-unspecified',
    'unknown-unspecified',
    'unknown-unspecified',
    'unknown-unspecified',
  ]);
});

test('Given malformed division inputs When normalized Then taxonomy fails closed without throwing', () => {
  // Given
  const malformedInputs = [null, undefined, '', {}, ['전체']];

  // When
  const normalized = malformedInputs.map((input) => analytics.normalizeEvent(input, input));

  // Then
  assert.deepEqual(normalized.map((event) => event.gender), malformedInputs.map(() => 'unknown'));
  assert.equal(normalized.every((event) => event.divisionKey.startsWith('unknown-')), true);
});

test('Given neutral affiliation text and misleading competition fields When classified Then competition taxonomy is ignored', () => {
  // Given
  const record = {
    team: '지역러닝클럽',
    divisionLevel: 'high',
    rawDivision: '실업부',
    divisionLabel: '남자 고등부',
    competitionName: '전국실업육상대회',
  };

  // When
  const category = classifyRecord(record);

  // Then
  assert.deepEqual(category, {
    category: 'unclassified',
    confidence: 0,
    reasons: ['insufficient_evidence'],
  });
});

test('Given the real index When season choices are built Then only specific level rankings are advertised', () => {
  // Given
  const index = analytics.getIndex();

  // When
  const rollupDivisions = index.divisions.filter(({ key }) => key.endsWith('-all'));
  const rollupTables = [...index.seasonTableByKey.keys()].filter((key) => key.endsWith('-all'));
  const advertisedLevels = new Set(
    [...index.seasonTableByKey.keys()]
      .map((key) => key.split('|')[2])
      .map((divisionKey) => index.divisions.find(({ key }) => key === divisionKey)?.level)
      .filter(Boolean),
  );

  // Then
  assert.deepEqual(rollupDivisions, []);
  assert.deepEqual(rollupTables, []);
  assert.equal(index.defaultSeasonSelection.divisionKey.endsWith('-all'), false);
  assert.equal(advertisedLevels.has('general'), true);
  assert.equal(advertisedLevels.has('high'), true);
  assert.equal(advertisedLevels.has('middle'), true);
});

test('Given a manually verified legacy identity When fallback segmentation runs Then the verified mapping wins', () => {
  // Given
  const originalResolve = identityResolver.resolve;
  identityResolver.resolve = () => 'at_verified_fixture_identity';

  try {
    // When
    const identity = analytics.resolveAthleteIdentity({
      name: '검증선수',
      team: '검증팀',
      gender: 'women',
      divisionLevel: 'middle',
    });

    // Then
    assert.equal(identity.athleteKey, 'at_verified_fixture_identity');
    assert.equal(identity.manuallyVerified, true);
  } finally {
    identityResolver.resolve = originalResolve;
  }
});

test('Given one legacy name-team identity across gender and levels When fallback keys are built Then candidates separate under one alias', () => {
  // Given
  const originalResolve = identityResolver.resolve;
  identityResolver.resolve = () => null;

  try {
    // When
    const menHigh = analytics.resolveAthleteIdentity({
      name: '동명이인',
      team: '같은소속',
      gender: 'men',
      divisionLevel: 'high',
    });
    const womenMiddle = analytics.resolveAthleteIdentity({
      name: '동명이인',
      team: '같은소속',
      gender: 'women',
      divisionLevel: 'middle',
    });

    // Then
    assert.equal(menHigh.legacyAthleteKey, womenMiddle.legacyAthleteKey);
    assert.notEqual(menHigh.athleteKey, womenMiddle.athleteKey);
    assert.equal(menHigh.manuallyVerified, false);
    assert.equal(womenMiddle.manuallyVerified, false);
  } finally {
    identityResolver.resolve = originalResolve;
  }
});

test('Given a real legacy key with multiple canonical candidates When its profile is requested Then no candidate is selected silently', () => {
  // Given
  const index = analytics.getIndex();
  const ambiguousAlias = [...index.legacyAthleteAliasesByKey.entries()]
    .find(([, candidates]) => candidates.size > 1)?.[0];
  assert.equal(typeof ambiguousAlias, 'string', 'the real fixture must contain an ambiguous legacy alias');

  // When
  const result = analytics.getAthleteSummary(ambiguousAlias);

  // Then
  assert.equal(result.ambiguity, 'multiple_candidates');
  assert.ok(result.candidates.length > 1);
  assert.equal(result.candidates.every((candidate) => candidate.athleteKey !== ambiguousAlias), true);
});

test('Given the identity map signature changes When the cached index is read Then the index is rebuilt', () => {
  // Given
  const originalGetStatus = identityResolver.getStatus;
  const originalStatus = originalGetStatus();
  let mtimeMs = originalStatus.mtimeMs + 1;
  identityResolver.getStatus = () => ({ ...originalStatus, mtimeMs });

  try {
    const firstIndex = analytics.getIndex();

    // When
    mtimeMs += 1;
    const refreshedIndex = analytics.getIndex();

    // Then
    assert.equal(refreshedIndex === firstIndex, false);
  } finally {
    identityResolver.getStatus = originalGetStatus;
  }
});

test('Given saved public record IDs When athlete keys are remapped Then exclusions and record deep links still resolve', () => {
  const originalResolve = identityResolver.resolve;
  const originalGetStatus = identityResolver.getStatus;
  const originalStatus = originalGetStatus();
  let identityGeneration = Date.now();
  let canonicalGroups = 0;
  identityResolver.resolve = () => null;
  identityResolver.getStatus = () => ({
    ...originalStatus,
    canonicalGroups,
    mtimeMs: identityGeneration,
  });

  try {
    const baseIndex = analytics.getIndex();
    const savedRecords = ['public_result', 'public_top_record_candidate'].map((sourceType) => {
      const record = baseIndex.records.find((candidate) => (
        candidate.source?.sourceType === sourceType
        && baseIndex.athleteByKey.get(candidate.athleteKey)?.records.length === 1
      ));
      assert.ok(record, `${sourceType} stability fixture is required`);
      return {
        athleteKey: record.athleteKey,
        factKey: recordFactKey(record),
        id: record.id,
        sourceType,
      };
    });

    identityResolver.resolve = ({ athleteKey }) => `at_${athleteKey}`;
    identityGeneration += 1;
    canonicalGroups = 1;
    const remappedIndex = analytics.getIndex();
    const previewService = createRecordWorkspacePreviewService({ getIndex: () => remappedIndex });

    for (const saved of savedRecords) {
      const remappedRecord = remappedIndex.records.find((record) => recordFactKey(record) === saved.factKey);
      assert.ok(remappedRecord, `${saved.sourceType} record facts must survive identity remapping`);
      assert.notEqual(remappedRecord.athleteKey, saved.athleteKey);
      assert.equal(
        remappedRecord.id,
        saved.id,
        `${saved.sourceType} public ID changed even though its record facts did not`,
      );

      const preview = previewService.getRecordWorkspacePreview({
        subjectKeys: [remappedRecord.athleteKey],
        limit: 50,
      });
      assert.equal(
        preview.records.find((record) => record.id === saved.id)?.id,
        saved.id,
        `${saved.sourceType} record deep link no longer resolves after identity remapping`,
      );
      const excludedRecordIds = new Set([saved.id]);
      assert.equal(
        preview.records.filter((record) => !excludedRecordIds.has(record.id)).some((record) => (
          recordFactKey(record) === saved.factKey
        )),
        false,
        `${saved.sourceType} saved exclusion no longer hides the remapped record`,
      );
    }
  } finally {
    identityResolver.resolve = originalResolve;
    identityResolver.getStatus = originalGetStatus;
    analytics.getIndex();
  }
});

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');

test('DIVISION-HIERARCHY-001 maps source labels to one canonical hierarchy key', () => {
  const high = recordAnalyticsService.normalizeEvent('남자 100m 결승', '남자고등학교부');
  const middleGrade = recordAnalyticsService.normalizeEvent('남자 100m 결승', '남자중학교 2학년부');
  const menOnly = recordAnalyticsService.normalizeEvent('남자 100m 결승', '남자부');
  const masters = recordAnalyticsService.normalizeEvent('M45 100m 결승', 'M45');
  const compositeElementary = recordAnalyticsService.normalizeEvent('남자 100m 결승', '남초,여초');
  const gradeOnlyHigh = recordAnalyticsService.normalizeEvent('100m 결승', '고 1학년부');
  const gradeOnlyMiddle = recordAnalyticsService.normalizeEvent('100m 결승', '중 1학년부');

  assert.equal(high.divisionKey, 'men-high');
  assert.equal(high.divisionLabel, '남자 고등부');
  assert.equal(high.divisionLevel, 'high');
  assert.equal(high.gender, 'men');

  assert.equal(middleGrade.divisionKey, 'men-middle');
  assert.equal(middleGrade.divisionLabel, '남자 중학부');
  assert.equal(middleGrade.divisionDetail, '남자중학교 2학년부');

  assert.equal(menOnly.divisionKey, 'men-unspecified');
  assert.equal(menOnly.divisionLabel, '남자 (세부부문 없음)');

  assert.equal(masters.divisionKey, 'men-masters');
  assert.equal(masters.divisionLabel, '남자 마스터즈');
  assert.equal(masters.divisionDetail, 'M45');

  assert.equal(compositeElementary.divisionKey, 'unknown-elementary');
  assert.equal(compositeElementary.divisionLabel, '초등부 (성별 구분 없음)');
  assert.equal(compositeElementary.gender, 'unknown');

  assert.equal(gradeOnlyHigh.divisionKey, 'unknown-high');
  assert.equal(gradeOnlyHigh.divisionLabel, '고등부 (성별 구분 없음)');
  assert.equal(gradeOnlyMiddle.divisionKey, 'unknown-middle');
  assert.equal(gradeOnlyMiddle.divisionLabel, '중학부 (성별 구분 없음)');
});

test('DIVISION-HIERARCHY-002 analytics filters remove kaaf-kind keys and keep TOP100 counts stable', () => {
  const index = recordAnalyticsService.getIndex();
  const kaafKindKeys = index.divisions.filter((division) => division.key.startsWith('kaaf-kind-'));
  const labels = index.divisions.map((division) => division.label);
  const duplicateLabels = labels.filter((label, indexInList) => labels.indexOf(label) !== indexInList);

  assert.deepEqual(kaafKindKeys, []);
  assert.deepEqual(duplicateLabels, []);
  assert.deepEqual(index.manualTopRecordStats, {
    totalCandidates: 16885,
    appended: 9510,
    skippedDuplicates: 7375,
    skippedSuppressed: 0,
    skippedInvalidName: 0,
    skippedInvalidRecord: 0,
  });
});

test('DIVISION-HIERARCHY-003 season records expose only level-specific rankings in fixed order', () => {
  const filters = recordAnalyticsService.getFilters();
  const menDivisions = filters.divisions.filter((division) => division.gender === 'men');

  assert.deepEqual(
    menDivisions.map((division) => division.level),
    ['general', 'high', 'university', 'middle', 'elementary', 'u20', 'u18', 'masters', 'unspecified'],
  );
  assert.equal(filters.divisions.some((division) => division.key.endsWith('-all')), false);

  const highSchool = recordAnalyticsService.getSeasonRecords({
    season: 2015,
    eventKey: '100m',
    divisionKey: 'men-high',
    limit: 20,
  });

  assert.ok(highSchool.rows.length > 0);
  assert.ok(highSchool.rows.every((row) => row.divisionLevel === 'high'));

  const index = recordAnalyticsService.getIndex();
  const middleEntry = [...index.seasonTableByKey.entries()].find(([key, rows]) => {
    const divisionKey = key.split('|')[2];
    return rows.length > 0 && index.divisions.some((division) => division.key === divisionKey && division.level === 'middle');
  });
  assert.ok(middleEntry, 'the real fixture must contain a middle-school season ranking');
  const [middleKey, middleRows] = middleEntry;
  assert.ok(middleRows.length > 0);
  assert.equal(middleKey.endsWith('-all'), false);
  assert.ok(middleRows.every((row) => row.divisionLevel === 'middle'));

  assert.ok(filters.defaultSeasonSelection);
  assert.ok(filters.defaultSeasonSelection.season);
  assert.ok(filters.defaultSeasonSelection.eventKey);
  assert.equal(filters.defaultSeasonSelection.divisionKey.endsWith('-all'), false);
  assert.ok(filters.defaultSeasonSelection.rowCount > 0);

  const defaultTable = recordAnalyticsService.getSeasonRecords(filters.defaultSeasonSelection);
  assert.ok(defaultTable.rows.length > 0);
});

test('DIVISION-HIERARCHY-004 rendered season controls keep gender and level choices context-valid', () => {
  const result = spawnSync(
    process.execPath,
    [
      VITEST_CLI,
      '--run',
      'src/features/record-workspace/season-navigation/SeasonRecordsPanel.test.tsx',
      'src/features/record-workspace/season-navigation/seasonNavigation.test.ts',
    ],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

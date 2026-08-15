const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
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

  assert.equal(compositeElementary.divisionKey, 'mixed-elementary');
  assert.equal(compositeElementary.divisionLabel, '혼성 초등부');
  assert.equal(compositeElementary.gender, 'mixed');

  assert.equal(gradeOnlyHigh.divisionKey, 'unknown-high');
  assert.equal(gradeOnlyHigh.divisionLabel, '고등부 (남녀 통합)');
  assert.equal(gradeOnlyMiddle.divisionKey, 'unknown-middle');
  assert.equal(gradeOnlyMiddle.divisionLabel, '중학부 (남녀 통합)');
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

test('DIVISION-HIERARCHY-003 season records expose gender rollup and fixed level ordering', () => {
  const filters = recordAnalyticsService.getFilters();
  const menDivisions = filters.divisions.filter((division) => division.gender === 'men');

  assert.equal(menDivisions[0].key, 'men-all');
  assert.deepEqual(
    menDivisions.map((division) => division.level),
    ['all', 'general', 'high', 'university', 'middle', 'elementary', 'u20', 'u18', 'masters', 'unspecified'],
  );

  const rollup = recordAnalyticsService.getSeasonRecords({
    season: 2015,
    eventKey: '100m',
    divisionKey: 'men-all',
    limit: 20,
  });
  const highSchool = recordAnalyticsService.getSeasonRecords({
    season: 2015,
    eventKey: '100m',
    divisionKey: 'men-high',
    limit: 20,
  });

  assert.equal(rollup.divisionLabel, '남자 전체(부 통합)');
  assert.ok(rollup.rows.length > 0);
  assert.ok(rollup.rows.some((row) => row.divisionLevel && row.divisionLabel));
  assert.ok(highSchool.rows.every((row) => row.divisionLevel === 'high'));
  assert.ok(!rollup.rows.some((row) => row.divisionDetail === '남초,여초' || row.divisionLabel === '혼성 초등부'));

  const mixedElementary = recordAnalyticsService.getSeasonRecords({
    season: 2026,
    eventKey: '100m',
    divisionKey: 'mixed-elementary',
    limit: 20,
  });
  assert.ok(mixedElementary.rows.every((row) => row.divisionKey === 'mixed-elementary'));
  assert.ok(mixedElementary.rows.every((row) => row.divisionLevel === 'elementary'));

  assert.ok(filters.defaultSeasonSelection);
  assert.ok(filters.defaultSeasonSelection.season);
  assert.ok(filters.defaultSeasonSelection.eventKey);
  assert.ok(filters.defaultSeasonSelection.divisionKey.endsWith('-all'));
  assert.ok(filters.defaultSeasonSelection.rowCount > 0);

  const defaultTable = recordAnalyticsService.getSeasonRecords(filters.defaultSeasonSelection);
  assert.ok(defaultTable.rows.length > 0);
});

test('DIVISION-HIERARCHY-004 records page uses two-step gender and level controls', () => {
  const page = fs.readFileSync(path.join(ROOT, 'frontend', 'src', 'pages', 'RecordsPage.tsx'), 'utf8');
  const panel = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'features', 'record-workspace', 'season-navigation', 'SeasonRecordsPanel.tsx'),
    'utf8',
  );
  const rows = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'features', 'record-workspace', 'season-navigation', 'SeasonRecordRows.tsx'),
    'utf8',
  );
  const api = fs.readFileSync(path.join(ROOT, 'frontend', 'src', 'api', 'recordAnalytics.ts'), 'utf8');

  assert.match(api, /genderOptions/);
  assert.match(api, /levelOptions/);
  assert.match(api, /defaultSeasonSelection/);
  assert.match(page, /defaultSeasonSelection/);
  assert.match(page, /<SeasonRecordsPanel/);
  assert.match(panel, /getSeasonNavigationOptions/);
  assert.match(panel, /options\.genderKey/);
  assert.match(panel, /options\.divisionLevel/);
  assert.match(panel, /성별 구분/);
  assert.match(panel, /경기 부문/);
  assert.match(panel, /<fieldset/);
  assert.match(panel, /<legend/);
  assert.match(panel, /aria-pressed=/);
  assert.match(panel, /htmlFor="season-records-season"/);
  assert.match(panel, /htmlFor="season-records-event"/);
  assert.match(panel, /htmlFor="season-records-division"/);
  assert.match(panel, /aria-controls="season-record-results"/);
  assert.match(rows, /<DivisionBadge/);
});

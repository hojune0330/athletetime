const assert = require('node:assert/strict');
const test = require('node:test');

const teamDetailService = require('../../card-studio/services/teamDetailService');
const teamStatisticsService = require('../../card-studio/services/teamStatisticsService');

const forbiddenKeys = new Set(['name', 'athleteKey', 'records', 'affiliations', 'workspace', 'note', 'attachment', 'sourceId']);

test('TEAM-PUBLIC-DTO-BOUNDARY Given raw team records When public aggregates are built Then personal and workspace fields never cross the boundary', () => {
  const records = teamRecords();
  const normalizeTeam = (value) => String(value || '').trim();
  const teamKey = teamDetailService.stableTeamId('안전육상팀');
  const detail = teamDetailService.getDetail({ records, normalizeTeam }, teamKey);
  const search = teamStatisticsService.search({ records, normalizeTeam }, '안전', 12);

  assert.ok(detail);
  assert.equal(search.length, 1);
  assert.deepEqual(findForbiddenKeys(detail), []);
  assert.deepEqual(findForbiddenKeys(search), []);
});

function findForbiddenKeys(value, path = '$') {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => findForbiddenKeys(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, item]) => [
    ...(forbiddenKeys.has(key) ? [`${path}.${key}`] : []),
    ...findForbiddenKeys(item, `${path}.${key}`),
  ]);
}

function teamRecords() {
  return [
    record('one', 'alpha-key', '알파', '100m', 1, 11.1),
    record('two', 'beta-key', '베타', '200m', 2, 22.4),
  ];
}

function record(id, athleteKey, name, eventLabel, rank, recordValue) {
  return {
    id,
    athleteKey,
    name,
    team: '안전육상팀',
    affiliations: ['안전육상팀'],
    workspace: { private: true },
    note: 'private',
    attachment: 'private.jpg',
    season: 2026,
    date: '2026-06-01',
    competitionId: 'safety-meet',
    competitionName: '안전 대회',
    eventKey: eventLabel.toLowerCase(),
    eventLabel,
    rank,
    phase: 'final',
    isComparable: true,
    windLegal: true,
    recordValue,
    direction: 'lower',
    source: { sourceId: 'private-source', capturedAt: '2026-06-02' },
  };
}

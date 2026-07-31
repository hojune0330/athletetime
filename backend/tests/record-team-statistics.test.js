const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../../card-studio/services/recordAnalyticsService');

test('team statistics search groups every indexed result by normalized affiliation', () => {
  const teams = analytics.searchTeamStatistics('진도', 20);
  const jindo = teams.find((team) => team.teamLabel === '진도군청');

  assert.ok(jindo, '진도군청 통계가 검색되어야 합니다.');
  assert.ok(jindo.athleteCount > 12, '선수 검색 기본 12명 제한과 무관하게 전체 소속 인원을 집계해야 합니다.');
  assert.ok(jindo.resultCount >= jindo.athleteCount);
  assert.ok(jindo.competitionCount > 0);
  assert.ok(jindo.seasonStats.length > 0);
  assert.ok(jindo.eventStats.length > 0);
  assert.equal(jindo.eventStats.some((event) => Array.isArray(event.athletes)), false);
  assert.match(jindo.disclaimer, /모은 공개 기록/);
});

test('team statistics search does not merge other affiliations containing the same place name', () => {
  const teams = analytics.searchTeamStatistics('진도', 20);
  const labels = teams.map((team) => team.teamLabel);

  assert.ok(labels.includes('진도군청'));
  assert.ok(labels.some((label) => label.includes('진도초등학교')));
  assert.equal(new Set(labels).size, labels.length);

  const jindo = teams.find((team) => team.teamLabel === '진도군청');
  const elementary = teams.find((team) => team.teamLabel.includes('진도초등학교'));
  assert.notEqual(jindo.teamKey, elementary.teamKey);
});


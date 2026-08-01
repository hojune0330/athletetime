const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../../card-studio/services/recordAnalyticsService');

test('team statistics search groups every indexed result by normalized affiliation', () => {
  // Given every indexed record whose normalized affiliation contains 진도.
  const teams = analytics.searchTeamStatistics('진도', 20);
  const jindo = teams.find((team) => team.teamLabel === '진도군청');

  // When the exact county-office team summary is selected.
  // Then it exposes a corporate-team classification with inspectable evidence.
  assert.ok(jindo, '진도군청 통계가 검색되어야 합니다.');
  assert.equal(jindo.primaryCategory, 'corporate');
  assert.ok(jindo.categoryBreakdown.some((item) => item.category === 'corporate' && item.resultCount > 0));
  assert.ok(jindo.performance.participation.competitionCount > 0);
  assert.ok(jindo.performance.podium.confirmed.total >= 0);
  assert.ok(jindo.performance.podium.ambiguous.total >= 0);
  assert.ok(jindo.performance.improvements.indexedImprovementCount >= 0);
  assert.ok(jindo.athleteCount > 12, '선수 검색 기본 12명 제한과 무관하게 전체 소속 인원을 집계해야 합니다.');
  assert.ok(jindo.resultCount >= jindo.athleteCount);
  assert.ok(jindo.competitionCount > 0);
  assert.ok(jindo.seasonStats.length > 0);
  assert.ok(jindo.eventStats.length > 0);
  assert.equal(jindo.eventStats.some((event) => Array.isArray(event.athletes)), false);
  assert.match(jindo.disclaimer, /모은 공개 기록/);
});

test('team statistics search does not merge other affiliations containing the same place name', () => {
  // Given county-office and school affiliations that share the same place name.
  const teams = analytics.searchTeamStatistics('진도', 20);
  const labels = teams.map((team) => team.teamLabel);

  assert.ok(labels.includes('진도군청'));
  assert.ok(labels.some((label) => label.includes('진도초등학교')));
  assert.equal(new Set(labels).size, labels.length);

  const jindo = teams.find((team) => team.teamLabel === '진도군청');
  const elementary = teams.find((team) => team.teamLabel.includes('진도초등학교'));

  // When their public category summaries are compared.
  // Then neither identity nor team category is collapsed into one bucket.
  assert.notEqual(jindo.teamKey, elementary.teamKey);
  assert.equal(elementary.primaryCategory, 'elementary');
});

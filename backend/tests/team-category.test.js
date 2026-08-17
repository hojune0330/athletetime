const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyRecord,
  summarizeRecordCategories,
} = require('../../card-studio/services/teamCategoryService');

test('Given a reviewed override When category is resolved Then the override wins with full confidence', () => {
  const result = classifyRecord(
    { team: '전남-검토팀', divisionLevel: 'general' },
    { teams: { 검토팀: { category: 'university', note: 'internal evidence URL' } } },
    '검토팀',
  );

  assert.deepEqual(result, {
    category: 'university',
    confidence: 1,
    reasons: ['operator_override:reviewed'],
  });
});

test('Given a school affiliation and conflicting division When category is resolved Then affiliation text wins', () => {
  const result = classifyRecord({ team: '시청처럼보이는고교', divisionLevel: 'high' });

  assert.equal(result.category, 'high');
  assert.deepEqual(result.reasons, ['team_signature:high']);
});

test('Given general or unspecified divisions When strong team names exist Then education and corporate teams remain findable', () => {
  const fixtures = [
    [{ team: '건국대학교(A)', divisionLevel: 'general' }, 'university'],
    [{ team: '서울체육고등학교', divisionLevel: 'unspecified' }, 'high'],
    [{ team: '진도군청', divisionLevel: 'general' }, 'corporate'],
  ];

  assert.deepEqual(
    fixtures.map(([record, expected]) => [classifyRecord(record).category, expected]),
    fixtures.map(([, expected]) => [expected, expected]),
  );
});

test('Given general records without strong evidence When category is resolved Then they remain unclassified', () => {
  const result = classifyRecord({ team: '지역러닝클럽', divisionLevel: 'general' });

  assert.equal(result.category, 'unclassified');
  assert.equal(result.confidence, 0);
});

test('Given mixed-category records When summarized Then no source category is discarded', () => {
  const result = summarizeRecordCategories([
    { team: '건국대학교', divisionLevel: 'general' },
    { team: '건국대학교', divisionLevel: 'high' },
    { team: '지역러닝클럽', divisionLevel: 'university' },
  ]);

  assert.equal(result.primaryCategory, 'university');
  assert.deepEqual(
    result.categoryBreakdown.map(({ category, resultCount }) => ({ category, resultCount })),
    [
      { category: 'university', resultCount: 2 },
      { category: 'unclassified', resultCount: 1 },
    ],
  );
});

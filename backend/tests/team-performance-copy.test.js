const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const TEAM_SURFACE_FILES = [
  'frontend/src/components/records/TeamStatisticsResults.tsx',
  'frontend/src/features/team-performance/TeamCategoryFilter.tsx',
  'frontend/src/features/team-performance/TeamPerformancePage.tsx',
  'frontend/src/features/team-performance/TeamPerformanceSummary.tsx',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('Given public team statistics When trust copy is scanned Then required limits stay visible', () => {
  // Given every public team statistics surface.
  const source = TEAM_SURFACE_FILES.map(read).join('\n');

  // When its user-facing copy is reviewed as one contract.
  const required = [
    'AthleteTime이 모은 공개 기록 기준이에요.',
    '공식 팀 명단이나 공식 입상 집계가 아니에요.',
    '단계가 확인되지 않은 1~3위 표기',
    '최고 갱신은 같은 공개 프로필 조각 안에서 계산했어요.',
  ];

  // Then collection limits and calculation scope cannot silently disappear.
  for (const phrase of required) assert.match(source, new RegExp(phrase));
});

test('Given public team statistics When claims and actions are scanned Then personal and official surfaces stay absent', () => {
  // Given the compact search card and independent aggregate page.
  const source = TEAM_SURFACE_FILES.map(read).join('\n');
  const forbidden = [
    '공식 메달 집계',
    '팀 랭킹',
    '전체 대회',
    '개인 PB 달성 확정',
    '현 소속 선수단',
    '기록 담기',
    '비교에 담기',
    '선수 목록',
  ];

  // When risky claims and athlete-level actions are checked, none are exposed.
  for (const phrase of forbidden) assert.doesNotMatch(source, new RegExp(phrase));
});

test('Given the shared records layout When the team page is inspected Then landmarks and filters remain accessible', () => {
  // Given a page nested inside the application main landmark.
  const page = read('frontend/src/features/team-performance/TeamPerformancePage.tsx');
  const filter = read('frontend/src/features/team-performance/TeamCategoryFilter.tsx');

  // When landmark and filter contracts are inspected.
  const categories = ['실업팀', '대학팀', '고등부', '중등부', '초등부', '분류 확인 중'];

  // Then the page adds no nested main and every fixed category remains keyboard-readable.
  assert.doesNotMatch(page, /<main\b/u);
  assert.match(page, /aria-label="팀 통계 보기"/u);
  assert.match(page, /seasons=\{detail\.coverage\.availableSeasons\}/u);
  assert.match(filter, /aria-pressed=/u);
  for (const category of categories) assert.match(filter, new RegExp(category));
});

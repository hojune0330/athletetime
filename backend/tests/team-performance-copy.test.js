const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const TEAM_SURFACE_FILES = [
  'frontend/src/components/records/TeamStatisticsResults.tsx',
  'frontend/src/features/team-performance/TeamCategoryFilter.tsx',
  'frontend/src/features/team-performance/teamCategoryLabels.ts',
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
    '소속 선수 명단이 아니라, AthleteTime이 모은 공개 기록의 통계예요.',
    '모든 대회를 뜻하지는 않아요.',
    '단계가 확인되지 않은 1~3위 표기',
    '기록 개선 확인은 같은 공개 프로필 조각 안에서 계산했어요.',
    '최근 시즌',
    '찾아진 공개 기록이 있는 시즌만 보여요.',
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
  const filter = [read('frontend/src/features/team-performance/TeamCategoryFilter.tsx'), read('frontend/src/features/team-performance/teamCategoryLabels.ts')].join('\n');

  // When landmark and filter contracts are inspected.
  const categories = ['전체', '실업·기관 소속', '대학 소속', '고교 소속', '중학교 소속', '초등학교 소속', '소속 유형 미확인'];

  // Then the page adds no nested main and every fixed category remains keyboard-readable.
  assert.doesNotMatch(page, /<main\b/u);
  assert.match(page, /aria-label="팀 통계 보기"/u);
  assert.match(page, /seasons=\{detail\.coverage\.availableSeasons\}/u);
  assert.ok((page.match(/focus-visible:ring-2/g) || []).length >= 3);
  assert.ok((page.match(/min-h-11/g) || []).length >= 3);
  assert.match(filter, /aria-pressed=/u);
  for (const category of categories) assert.match(filter, new RegExp(category));
});

test('Given team browsing without a chosen type When the route is built Then corporate is never forced', () => {
  // Given the records entry point and invalid-link recovery surface.
  const recordsPage = read('frontend/src/pages/RecordsPage.tsx');
  const teamPage = read('frontend/src/features/team-performance/TeamPerformancePage.tsx');

  // When neutral team routes are scanned.
  const source = `${recordsPage}\n${teamPage}`;

  // Then missing or invalid categories remain neutral until the user selects one.
  assert.doesNotMatch(source, /\?\? 'corporate'/u);
  assert.doesNotMatch(source, /category=corporate/u);
  assert.doesNotMatch(source, /next\.set\('category', 'corporate'\)/u);
});

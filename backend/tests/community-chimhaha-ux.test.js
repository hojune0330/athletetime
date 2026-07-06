/**
 * 커뮤니티 침하하 스타일 UX 계약 테스트
 *
 * 구조 계약:
 * - COMM-BEST-001: 인기글 스트립 (전체/주간/월간/명예의 전당 탭 + 가로 카드)
 * - COMM-BOARD-001: 게시판 탭 (전체글 + 카테고리 게시판)
 * - COMM-LIST-001: 밀도 높은 게시글 리스트 (카테고리 라벨·제목·[댓글수]·메타 행·우측 썸네일)
 * - COMM-PAGE-001: 커뮤니티 페이지 통합 구조
 * - COMM-TONE-001: 신뢰 가드 (공식/랭킹/검증/예측 금지)
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const FILES = [
  'frontend/src/components/community/CommunityBestStrip.tsx',
  'frontend/src/components/community/CommunityBoardTabs.tsx',
  'frontend/src/components/post/PostList.tsx',
  'frontend/src/pages/CommunityPage.tsx',
  'frontend/src/pages/BoardPage.tsx',
];

test('COMM-BEST-001: best strip has period tabs and horizontal card strip', () => {
  const source = readSource('frontend/src/components/community/CommunityBestStrip.tsx');

  // 침하하식 기간 탭: 전체 인기글 | 주간 | 월간 | 명예의 전당
  assert.match(source, /전체 인기글/);
  assert.match(source, /주간/);
  assert.match(source, /월간/);
  assert.match(source, /명예의 전당/);

  // 탭 접근성 + 가로 스크롤 스트립
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /overflow-x-auto/);

  // 기간 필터는 클라이언트에서 hot 결과를 나눔 (주간 7일, 월간 30일)
  assert.match(source, /withinDays\(post\.created_at, 7\)/);
  assert.match(source, /withinDays\(post\.created_at, 30\)/);
  assert.match(source, /sort: 'hot'/);

  // 카드 메타: 좋아요/댓글/조회수 아이콘 (SVG, heroicons)
  assert.match(source, /HandThumbUpIcon/);
  assert.match(source, /ChatBubbleLeftIcon/);
  assert.match(source, /EyeIcon/);

  // 순위 뱃지
  assert.match(source, /rank/);
});

test('COMM-BOARD-001: board tabs cover 전체글 + category boards and stay extensible', () => {
  const source = readSource('frontend/src/components/community/CommunityBoardTabs.tsx');

  assert.match(source, /전체글/);
  for (const board of ['자유', '훈련', '대회', '장비', '질문', '공지']) {
    assert.match(source, new RegExp(board));
  }

  // 백엔드 카테고리 API로 확장 가능해야 함
  assert.match(source, /useCategories/);
  assert.match(source, /aria-current/);
  assert.match(source, /overflow-x-auto/);
});

test('COMM-LIST-001: post list renders dense chimhaha-style rows', () => {
  const source = readSource('frontend/src/components/post/PostList.tsx');

  // 제목 옆 [댓글수] 강조 (침하하식)
  assert.match(source, /\[\{post\.comments_count\}\]/);

  // 우측 썸네일 (좌측 큰 썸네일 금지)
  assert.match(source, /shrink-0 rounded-lg object-cover/);

  // 메타 행: 좋아요/작성자/조회수/시간
  assert.match(source, /HandThumbUpIcon/);
  assert.match(source, /EyeIcon/);
  assert.match(source, /formatRelativeTime/);

  // 공지는 라벨 뱃지로 표시
  assert.match(source, /is_notice/);

  // 밀도: truncate 한 줄 제목
  assert.match(source, /truncate/);
});

test('COMM-PAGE-001: community page composes strip + board tabs + sorted list', () => {
  const source = readSource('frontend/src/pages/CommunityPage.tsx');

  assert.match(source, /CommunityBestStrip/);
  assert.match(source, /CommunityBoardTabs/);
  assert.match(source, /PostList/);
  assert.match(source, /Pagination/);

  // 게시판 선택이 목록 카테고리 필터로 이어짐
  assert.match(source, /boardCategory/);
  assert.match(source, /handleSelectBoard/);

  // 기존 기록 컨텍스트 여정 유지
  assert.match(source, /RecordContextPrompt/);
  assert.match(source, /handleStartRecordDiscussion/);
  assert.match(source, /기록 이야기부터 가볍게/);

  // 정렬 3종 유지
  assert.match(source, /'latest' \| 'hot' \| 'comment'/);
});

test('COMM-PAGE-002: board page uses light theme (no legacy dark classes)', () => {
  const source = readSource('frontend/src/pages/BoardPage.tsx');

  assert.equal(source.includes('bg-dark-700'), false);
  assert.equal(source.includes('text-white mb-2'), false);
  assert.match(source, /text-neutral-900/);
});

test('COMM-TONE-001: community surfaces avoid forbidden trust words and emoji icons in chrome', () => {
  for (const file of FILES) {
    const source = readSource(file);
    assert.doesNotMatch(source, /공식 인증|랭킹|AI 검증|예측|평가 등급/, `${file} must avoid trust-violating words`);
  }

  // 새 컴포넌트의 UI 아이콘은 SVG(heroicons)만 사용
  const strip = readSource('frontend/src/components/community/CommunityBestStrip.tsx');
  const tabs = readSource('frontend/src/components/community/CommunityBoardTabs.tsx');
  assert.match(strip, /@heroicons\/react/);
  for (const source of [strip, tabs]) {
    // 이모지 문자가 UI 크롬에 없어야 함 (기본 다국어 이모지 범위 검사)
    assert.doesNotMatch(source, /[\u{1F300}-\u{1FAFF}]/u, 'no emoji as UI icons');
  }
});

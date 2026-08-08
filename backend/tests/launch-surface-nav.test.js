const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/**
 * 단계적 공개(staged launch) 네비게이션 계약.
 *
 * 최종 결정 블루프린트(docs/athletetime-final-decision-blueprint.md)의 원칙:
 * "완성도 낮은 기능은 숨기거나 약화시키고, 기록·대회 중심의 핵심 루프만 1차 노출한다."
 *
 * 이 테스트는 헤더의 1차 네비가 검증된 핵심 루프만 담고,
 * 준비 중 기능이 1차 네비로 승격되지 않도록 잠근다.
 */
test('header primary nav only exposes the core record loop', () => {
  const header = readSource('frontend/src/components/layout/Header.tsx');

  const primaryBlock = header.slice(
    header.indexOf('const primaryNavItems'),
    header.indexOf('const moreNavItems'),
  );
  assert.ok(primaryBlock.length > 0, 'primaryNavItems must be defined before moreNavItems');

  assert.match(primaryBlock, /\/records/);
  assert.match(primaryBlock, /\/competitions/);
  assert.match(primaryBlock, /\/profile-card/);

  for (const blocked of ['/pacerise', '/pace-calculator', '/training-calculator', '/marketplace', '/community', '/chat']) {
    assert.equal(
      primaryBlock.includes(blocked),
      false,
      `primary nav must not include ${blocked}; keep it under the more menu`,
    );
  }
});

test('secondary tools stay reachable through the more menu group', () => {
  const header = readSource('frontend/src/components/layout/Header.tsx');

  const moreBlock = header.slice(
    header.indexOf('const moreNavItems'),
    header.indexOf('const navItems'),
  );
  assert.ok(moreBlock.length > 0, 'moreNavItems must be defined before navItems alias');

  // 숨기는 게 아니라 낮추는 것 — 더보기 그룹에서는 전부 접근 가능해야 한다.
  for (const kept of ['/pacerise', '/pace-calculator', '/training-calculator', '/marketplace', '/community', '/chat']) {
    assert.match(moreBlock, new RegExp(kept.replace(/\//g, '\\/')));
  }

  // PaceRise 연동 화면은 3차 가공임을 네비 단계에서부터 표시한다.
  assert.match(moreBlock, /PaceRise \uc5f0\ub3d9/);
  assert.match(moreBlock, /path: '\/community', label: '커뮤니티', note: '준비 중'/);
  // 채팅「자유수다」는 실서비스화 — '준비 중' note가 제거되어야 한다.
  assert.match(moreBlock, /path: '\/chat', label: '오픈 채팅'/);
  assert.equal(moreBlock.includes("note: '준비 중',"), false);
});

test('W2-PACERISE-LABEL-001: pacerise more-menu label describes result lookup, not live coverage', () => {
  const header = readSource('frontend/src/components/layout/Header.tsx');

  const moreBlock = header.slice(
    header.indexOf('const moreNavItems'),
    header.indexOf('const navItems'),
  );

  assert.match(moreBlock, /label: '실업 대회 결과'/);
  assert.equal(moreBlock.includes("label: '실업 라이브'"), false);
});

test('W1-DEAD-FILES-001: retired launch-surface files stay deleted after staged IA consolidation', () => {
  for (const retiredPath of [
    'frontend/src/pages/HomePage.tsx',
    'frontend/src/components/layout/Sidebar.tsx',
    'frontend/src/components/layout/RightBanner.tsx',
  ]) {
    assert.equal(
      fs.existsSync(path.join(ROOT, retiredPath)),
      false,
      `${retiredPath} should stay deleted; the launch surface uses MainPage/Header instead`,
    );
  }
});

test('mobile tab bar mirrors the same core loop entries', () => {
  const tabBar = readSource('frontend/src/components/layout/MobileTabBar.tsx');

  assert.match(tabBar, /path: '\/records'/);
  assert.match(tabBar, /path: '\/competitions'/);

  for (const blocked of ['/pacerise', '/pace-calculator', '/marketplace', '/community', '/chat']) {
    assert.equal(tabBar.includes(`path: '${blocked}'`), false, `tab bar must not include ${blocked}`);
  }
});

test('not-found page recovers users into the record search loop', () => {
  const notFound = readSource('frontend/src/pages/NotFoundPage.tsx');

  // 죽은 끝이 아니라 핵심 루프로 복귀시키는 검색 폼이 있어야 한다.
  assert.match(notFound, /\/records\?q=\$\{encodeURIComponent\(trimmed\)\}/);
  assert.match(notFound, /\/records/);
  assert.match(notFound, /\/competitions/);
  assert.match(notFound, /placeholder="이름 또는 소속\(학교·팀\)"/);
  assert.doesNotMatch(notFound, /placeholder="선수 이름, 소속, 종목"/);
  assert.match(notFound, /이름·소속으로 공개 기록 찾기/);
  assert.doesNotMatch(notFound, /이름·소속·종목으로 공개 기록 찾기/);

  // 신뢰 톤 — 미래약속·과장 금지.
  assert.equal(notFound.includes('곧'), false);
  assert.equal(notFound.includes('예정'), false);
});

test('home hero carries a first-visit trust anchor to about-data and data-request', () => {
  const main = readSource('frontend/src/pages/MainPage.tsx');

  // 검색 전에 무엇을 보게 되는지 사람 언어로 고지 + 검증/정정 경로 노출.
  assert.match(main, /공식 기록 서비스는 아니에요/);
  assert.match(main, /to="\/about-data"/);
  assert.match(main, /to="\/data-request"/);
});

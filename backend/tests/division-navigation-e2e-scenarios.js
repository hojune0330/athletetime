const assert = require('node:assert/strict');
const { capturePage } = require('./division-navigation-e2e-capture');
const { activateFocused, reachFocusVisible } = require('./division-navigation-e2e-keyboard');
const { expectVisible, navigateToReady } = require('./records-flow-e2e-fixture');

async function captureViewportMatrix(state, captures) {
  await captureCandidateSearch(state, captures);
  await captureRecordProvenance(state, captures);
  await captureValidSeason(state, captures);
  await captureInvalidAndEmptySeason(state, captures);
  await captureTeamAffiliation(state, captures);
}

async function assertCjkWrapStyle(locator) {
  const style = await locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      textWrap: computed.getPropertyValue('text-wrap'),
      wordBreak: computed.wordBreak,
    };
  });
  assert.deepEqual(style, { textWrap: 'pretty', wordBreak: 'keep-all' });
}

async function captureCandidateSearch(state, captures) {
  const { apiRequests, baseUrl, page } = state;
  const requestStart = apiRequests.length;
  const candidate = page.locator('[data-candidate-key="alpha-2016"]');
  await navigateToReady(
    page,
    `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`,
    candidate,
  );
  const searchRequests = apiRequests.slice(requestStart)
    .filter((request) => request.includes('/analytics/records/search'));
  assert.equal(searchRequests.length, 1);
  assert.equal(new URL(searchRequests[0], baseUrl).searchParams.get('q'), 'Alpha');
  assert.equal(await page.locator('[data-candidate-key^="alpha-"]').count(), 2);
  assert.equal(await page.locator('[data-candidate-key="beta-2016"]').count(), 0);
  await expectVisible(candidate.getByText('부문 · 남자 고등부', { exact: true }));
  assert.match(await candidate.getAttribute('aria-label') || '', /부문 남자 고등부/u);
  await assertCjkWrapStyle(candidate.locator('[role="note"]'));
  await reachFocusVisible(page, candidate);
  await capturePage(state, { captures, scenario: 'athlete-candidate-search', anchor: candidate });
  await activateFocused(page, candidate);
  await page.waitForURL((url) => url.pathname === '/records/athletes/alpha-2016');
}

async function captureRecordProvenance(state, captures) {
  const { baseUrl, page } = state;
  const row = page.locator('[data-record-row]').first();
  await navigateToReady(page, `${baseUrl}/records/athletes/alpha-2016`, row);
  assert.match(await row.getAttribute('aria-label') || '', /부문 남자 고등부/u);
  await reachFocusVisible(page, row);
  await activateFocused(page, row);
  const provenance = page.getByText('원문 표기: "남고"', { exact: false });
  const source = page.getByText('athletetime_fixture 공개 경기결과', { exact: true });
  const capturedAt = page.getByText('2026-07-13T00:00:00.000Z', { exact: true });
  const correction = page.getByRole('link', { name: '기록이 틀렸어요', exact: true });
  await expectVisible(provenance);
  await expectVisible(source);
  await expectVisible(capturedAt);
  await expectVisible(page.getByRole('button', { name: '기록 상세 닫기', exact: true }));
  await correction.scrollIntoViewIfNeeded();
  await reachFocusVisible(page, correction, 'reverse');
  assert.ok(new URL(page.url()).searchParams.get('record'));
  await capturePage(state, {
    captures,
    scenario: 'athlete-record-provenance',
    anchor: provenance,
  });
}

async function captureValidSeason(state, captures) {
  const { baseUrl, page } = state;
  const summary = page.getByText('2026 · 100m · 남자 고등부', { exact: true });
  await navigateToReady(
    page,
    `${baseUrl}/records?flow=browse&browse=season&season=2026&event=100m&division=men-high`,
    summary,
  );
  const season = page.locator('#season-records-season');
  const event = page.locator('#season-records-event');
  const division = page.locator('#season-records-division');
  assert.match(await page.locator('label[for="season-records-season"]').textContent() || '', /시즌/u);
  assert.match(await page.locator('label[for="season-records-event"]').textContent() || '', /종목/u);
  assert.match(await page.locator('label[for="season-records-division"]').textContent() || '', /경기 부문/u);
  assert.equal(await season.inputValue(), '2026');
  assert.deepEqual(await event.locator('option').allTextContents(), ['100m', '200m']);
  assert.equal(await division.inputValue(), 'high');
  assert.equal(
    await page.getByRole('button', { name: '남자', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  await reachFocusVisible(page, season);
  await capturePage(state, { captures, scenario: 'valid-season-navigation', anchor: summary });
}

async function captureInvalidAndEmptySeason(state, captures) {
  const { apiRequests, baseUrl, page } = state;
  const requestStart = apiRequests.length;
  const invalidUrl = `${baseUrl}/records?flow=browse&browse=season&season=2025&event=200m&division=women-high&keep=1`;
  await page.goto(invalidUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const params = new URL(window.location.href).searchParams;
    return params.get('season') === '2025'
      && params.get('event') === '100m'
      && params.get('division') === 'men-high'
      && document.body.textContent?.includes('이 조합은 아직 정리 중이에요');
  });
  const seasonRequests = apiRequests.slice(requestStart)
    .filter((request) => request.includes('/analytics/season-records'));
  assert.equal(seasonRequests.length, 1);
  assert.match(seasonRequests[0], /season=2025/u);
  assert.match(seasonRequests[0], /eventKey=100m/u);
  assert.match(seasonRequests[0], /divisionKey=men-high/u);
  assert.doesNotMatch(seasonRequests[0], /eventKey=200m|divisionKey=women-high/u);
  assert.equal(new URL(page.url()).searchParams.get('keep'), '1');
  const empty = page.getByText('이 조합은 아직 정리 중이에요', { exact: true });
  const recovery = page.getByRole('button', { name: '가장 가까운 시즌 보기', exact: true });
  await expectVisible(empty);
  const emptyStatus = page.getByRole('status').filter({ hasText: '이 조합은 아직 정리 중이에요' });
  await assertCjkWrapStyle(emptyStatus.locator('p').nth(1));
  await reachFocusVisible(page, recovery);
  assert.equal(new URL(page.url()).searchParams.get('season'), '2025');
  await capturePage(state, {
    captures,
    scenario: 'invalid-url-valid-empty-recovery',
    anchor: empty,
  });
  await activateFocused(page, recovery);
  await page.waitForURL((url) => url.searchParams.get('season') === '2026');
}

async function captureTeamAffiliation(state, captures) {
  const { baseUrl, page } = state;
  const teamLink = page.getByRole('link', { name: '예시군청 소속 통계 보기', exact: true });
  await navigateToReady(
    page,
    `${baseUrl}/records?flow=browse&browse=team&category=corporate&q=${encodeURIComponent('예시')}`,
    teamLink,
  );
  await expectVisible(page.getByText('소속 유형', { exact: true }));
  const explanation = page.locator('section[aria-label="예시 소속 검색 결과"] p')
    .filter({ hasText: '개인 기록은 보여주지 않아요.' });
  await expectVisible(explanation);
  await assertCjkWrapStyle(explanation);
  const footer = page.getByText('자료가 있는 대회 기록만 보여드려요.', { exact: false }).last();
  await assertCjkWrapStyle(footer);
  const corporate = page.getByRole('button', { name: '실업·기관 소속', exact: true });
  assert.equal(await corporate.getAttribute('aria-pressed'), 'true');
  await expectVisible(teamLink.getByText('실업·기관 소속', { exact: true }));
  await reachFocusVisible(page, teamLink);
  await capturePage(state, {
    captures,
    scenario: 'team-search-affiliation-wording',
    anchor: teamLink,
  });
  await activateFocused(page, teamLink);
  await page.waitForURL((url) => url.pathname === '/records/teams/0123456789abcdef');
}

module.exports = { captureViewportMatrix };

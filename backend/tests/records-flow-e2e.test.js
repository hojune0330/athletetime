const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertCountAtLeast,
  expectUrlParam,
  expectVisible,
  selectedCandidateCount,
  waitForSelectedCandidateCount,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

test('RECORDS-FLOW-E2E Given /records When using Mine, Browse, and shared links Then Track J routing works in a real browser', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.goto(`${baseUrl}/records`, { waitUntil: 'domcontentloaded' });
    visited.push(page.url());
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    assert.equal(await page.locator('#records-search').count(), 0, 'hub renders before the search surface');

    await page.getByRole('button', { name: /기록 찾아 모으기/ }).first().click();
    await page.waitForURL(/flow=mine.*step=name|step=name.*flow=mine/);
    await expectVisible(page.locator('[data-records-step="mine-name"]'));
    await page.locator('#mine-records-name').fill('Alpha');
    await page.locator('[data-records-sticky-cta="mine-name"] button').click();
    await page.waitForURL(/step=candidates/);
    await expectVisible(page.locator('[data-records-step="mine-candidates"]'));

    const candidateButtons = page.locator('[data-records-step="mine-candidates"] button[aria-pressed]');
    await assertCountAtLeast(candidateButtons, 2, 'candidate step should render API-backed candidates');
    await candidateButtons.filter({ hasText: 'Seoul High' }).click();
    await expectUrlParam(page, 'mineDraft', 'alpha-2016');
    await waitForSelectedCandidateCount(page, 1);
    await candidateButtons.filter({ hasText: 'Seoul Track Club' }).click();
    await expectUrlParam(page, 'mineDraft', 'alpha-2020');
    await waitForSelectedCandidateCount(page, 2);
    assert.equal(await selectedCandidateCount(page), 2, 'selected draft candidates are reflected in the DOM');
    visited.push(page.url());

    await page.goBack();
    await page.waitForURL(/step=name/);
    await expectVisible(page.locator('[data-records-step="mine-name"]'));

    await page.goForward();
    await page.waitForURL(/step=candidates/);
    await expectVisible(page.locator('[data-records-step="mine-candidates"]'));
    await expectUrlParam(page, 'mineDraft', 'alpha-2016');
    assert.equal(await selectedCandidateCount(page), 2, 'browser Forward restores selected draft candidates');

    await page.locator('[data-records-sticky-cta="mine-candidates"] button').click();
    await page.waitForURL(/step=confirm/);
    await expectVisible(page.locator('[data-records-step="mine-confirm"]'));
    assert.equal(await page.locator('[data-records-step="mine-confirm"] button[aria-pressed]').count(), 2);

    await page.locator('[data-records-sticky-cta="mine-confirm"] button').last().click();
    await page.waitForURL(/step=done/);
    await expectVisible(page.locator('[data-records-step="mine-done"]'));
    assert.equal(new URL(page.url()).searchParams.get('mineDraft'), null, 'done step clears draft URL state');
    visited.push(page.url());

    await page.goto(`${baseUrl}/records?flow=browse`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page.locator('[data-records-flow="browse"]'));
    await expectVisible(page.getByRole('button', { name: /선수 찾기/ }));
    await expectVisible(page.getByRole('button', { name: /소속 통계 보기/ }));
    await expectVisible(page.getByRole('button', { name: /시즌 기록표/ }));
    visited.push(page.url());

    await page.goto(`${baseUrl}/records?athlete=alpha-2016`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page.locator('text=Alpha Kim'));
    await expectVisible(page.locator('text=기록 한눈에'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'athlete shared link bypasses the hub');
    visited.push(page.url());

    await page.goto(`${baseUrl}/records/athletes/alpha-2016`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page.getByRole('button', { name: '이 선수 담기', exact: true }));
    await expectVisible(page.getByText('같은 이름의 다른 선수일 수 있어요.', { exact: false }));
    assert.equal(
      await page.getByRole('button', { name: '이 선수 후보 담기', exact: true }).count(),
      0,
      'dedicated athlete action uses the same candidate-selection wording as search',
    );
    visited.push(page.url());

    await page.goto(`${baseUrl}/records?compare=alpha-2016,beta-2016`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page.locator('text=기록 나란히 보기'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'compare shared link bypasses the hub');
    visited.push(page.url());
  });
});

test('TEAM-FLOW-E2E Given neutral team browse When searching and opening a team Then real local aggregates preserve URL state', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    // Given team browse starts without silently selecting a team category.
    await page.goto(`${baseUrl}/records?flow=browse&browse=team`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page.getByRole('heading', { name: '소속의 기록을 숫자로 살펴봐요.' }));
    await expectVisible(page.locator('#records-search'));
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    assert.equal(await page.getByRole('button', { name: '전체', exact: true }).getAttribute('aria-pressed'), 'true');

    // When a real indexed affiliation query is submitted through the browser.
    await page.locator('#records-search').fill('진도');
    await page.getByRole('button', { name: '검색', exact: true }).click();

    // Then teams from different inferred categories remain visible in the neutral result set.
    await expectVisible(page.getByRole('link', { name: '진도군청 팀 통계 보기' }));
    await expectVisible(page.getByRole('link', { name: '전남진도초등학교 팀 통계 보기' }));
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    visited.push(page.url());

    // When one result is opened, the branch backend supplies its aggregate detail.
    await page.getByRole('link', { name: '진도군청 팀 통계 보기' }).click();
    await page.waitForURL(/\/records\/teams\/[a-f0-9]{16}/u);
    await expectVisible(page.locator('[data-team-performance-page]'));
    await expectVisible(page.getByRole('heading', { name: '진도군청' }));
    await expectVisible(page.getByText('개인 기록을 나열하지 않고', { exact: false }));
    assert.equal(new URL(page.url()).searchParams.get('category'), null);

    // Then period and section changes stay encoded in the shareable URL.
    await page.getByRole('button', { name: '최근', exact: true }).click();
    await expectUrlParam(page, 'scope', 'latest');
    await page.getByRole('button', { name: '종목', exact: true }).click();
    await expectUrlParam(page, 'view', 'events');
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    visited.push(page.url());
  }, {
    fileName: 'team-flow-e2e-results.json',
    scenario: 'team browse and aggregate detail flow e2e',
    invocation: 'node --test backend/tests/records-flow-e2e.test.js',
  });
});

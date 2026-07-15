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
    await page.goto(`${baseUrl}/records`, { waitUntil: 'networkidle' });
    visited.push(page.url());
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    assert.equal(await page.locator('#records-search').count(), 0, 'hub renders before the search surface');

    await page.getByRole('button', { name: /내 기록 찾기/ }).first().click();
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

    await page.goto(`${baseUrl}/records?flow=browse`, { waitUntil: 'networkidle' });
    await expectVisible(page.locator('[data-records-flow="browse"]'));
    await expectVisible(page.getByRole('button', { name: /선수 찾기/ }));
    await expectVisible(page.getByRole('button', { name: /팀\(소속\)으로 찾기/ }));
    await expectVisible(page.getByRole('button', { name: /시즌 기록표/ }));
    visited.push(page.url());

    await page.goto(`${baseUrl}/records?athlete=alpha-2016`, { waitUntil: 'networkidle' });
    await expectVisible(page.locator('text=Alpha Kim'));
    await expectVisible(page.locator('text=기록 한눈에'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'athlete shared link bypasses the hub');
    visited.push(page.url());

    await page.goto(`${baseUrl}/records?compare=alpha-2016,beta-2016`, { waitUntil: 'networkidle' });
    await expectVisible(page.locator('text=기록 나란히 보기'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'compare shared link bypasses the hub');
    visited.push(page.url());
  });
});

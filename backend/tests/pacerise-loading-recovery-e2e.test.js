const assert = require('node:assert/strict');
const test = require('node:test');
const { expectVisible, withRecordsPage } = require('./records-flow-e2e-fixture');

test('PACERISE-LOADING-RECOVERY-E2E Given a slow competition feed When a mobile visitor waits Then they can retry or open available records', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    const keepPending = () => new Promise(() => {});
    await page.route('**/api/pacerise/competitions', keepPending);
    await page.route('**/api/pacerise/live', keepPending);

    await page.goto(`${baseUrl}/pacerise`, { waitUntil: 'domcontentloaded' });

    await expectVisible(page.getByText('실업 대회 정보를 불러오는 중이에요.', { exact: true }));
    await expectVisible(page.getByText('조금 더 걸릴 수 있어요. 다른 화면을 먼저 둘러봐도 괜찮아요.', { exact: true }));

    const retry = page.getByRole('button', { name: '다시 시도', exact: true });
    const records = page.getByRole('link', { name: '대회·기록 보기', exact: true });
    assert.equal(await retry.isVisible(), true);
    assert.equal(await records.getAttribute('href'), '/competitions?tab=results');
    visited.push(page.url());
  }, { fileName: 'pacerise-loading-recovery-e2e-results.json', scenario: 'PaceRise slow initial load recovery at mobile width' });
});

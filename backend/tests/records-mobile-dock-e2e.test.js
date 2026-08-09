const assert = require('node:assert/strict');
const test = require('node:test');
const {
  expectVisible,
  navigateToReady,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

test('RECORDS-MOBILE-DOCK-E2E Given a saved comparison When workspace selection starts Then only the selection dock remains fixed', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('athletetime.compareTray.v1', JSON.stringify([{
        athleteKey: 'alpha-2016',
        name: 'Alpha Kim',
        team: 'Seoul High',
      }]));
    });

    await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`);
    await expectVisible(page.getByText('기록 나란히 보기', { exact: true }));

    await page.getByRole('button', { name: '선수 기록 모아 보기', exact: true }).click();

    await expectVisible(page.getByLabel('선택한 선수'));
    assert.equal(await page.getByText('기록 나란히 보기', { exact: true }).count(), 0);
    visited.push(page.url());
  });
});

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

    await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`, page.getByText('기록 나란히 보기', { exact: true }));
    await expectVisible(page.getByText('기록 나란히 보기', { exact: true }));

    await page.getByRole('button', { name: '선수 기록 모아 보기', exact: true }).click();

    await expectVisible(page.getByLabel('선택한 선수'));
    assert.equal(await page.getByText('기록 나란히 보기', { exact: true }).count(), 0);
    visited.push(page.url());
  });
});

test('MOBILE-COMPARE-TRAY-E2E Given two saved candidates When the comparison tray opens Then every action is touch-safe and focus-visible', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('athletetime.compareTray.v1', JSON.stringify([
        { athleteKey: 'alpha-2016', name: 'Alpha Kim', team: 'Seoul High' },
        { athleteKey: 'alpha-2020', name: 'Alpha Kim', team: 'Seoul Track Club' },
      ]));
    });

    // Given two separately selected public-record candidates.
    await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`, page.getByRole('button', { name: '나란히 보기', exact: true }));

    const removeButtons = page.getByRole('button', { name: /비교에서 빼기/u });
    const clearButton = page.getByRole('button', { name: '비우기', exact: true });
    const compareButton = page.getByRole('button', { name: '나란히 보기', exact: true });
    await expectVisible(compareButton);
    assert.equal(await removeButtons.count(), 2);

    // When the tray actions are inspected at a 375px viewport.
    const controls = [removeButtons.nth(0), removeButtons.nth(1), clearButton, compareButton];
    for (const control of controls) {
      const bounds = await control.boundingBox();
      assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44, 'each comparison action has a 44px touch target');
      assert.match(await control.getAttribute('class') || '', /focus-visible:ring-2/u);
    }

    // Then keyboard focus can reach the comparison action before the person chooses it.
    await compareButton.focus();
    assert.equal(await compareButton.evaluate((element) => document.activeElement === element), true);
    visited.push(page.url());
  });
});

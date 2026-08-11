const assert = require('node:assert/strict');
const test = require('node:test');
const { expectVisible, navigateToReady, withRecordsPage } = require('./records-flow-e2e-fixture');

test('RECORDS-DEVICE-CLEAR-E2E Given one protected local record choice When cleanup cannot remove it Then the screen does not claim it was erased', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('athletetime.my-athlete.v2', JSON.stringify([{
        athleteKey: 'alpha-2016',
        name: 'Alpha Kim',
        team: 'Seoul High',
        savedAt: '2026-08-11T00:00:00.000Z',
      }]));

      const removeItem = Storage.prototype.removeItem;
      Object.defineProperty(Storage.prototype, 'removeItem', {
        configurable: true,
        value(key) {
          if (key === 'athletetime.my-athlete.v2' && !window.__recordDeviceCleanupFailedOnce) {
            window.__recordDeviceCleanupFailedOnce = true;
            throw new DOMException('Local record choice cannot be removed.', 'SecurityError');
          }
          return removeItem.call(this, key);
        },
      });
    });

    await navigateToReady(page, `${baseUrl}/records`, page.locator('[data-records-flow="hub"]'));
    const cleanupButton = page.getByRole('button', { name: '이 기기의 기록 선택 정리', exact: true });
    await expectVisible(cleanupButton);
    await cleanupButton.click();
    await page.getByRole('button', { name: '정말 모두 지우기', exact: true }).click();

    const warning = page.getByRole('alert');
    await expectVisible(warning);
    assert.match(await warning.textContent() || '', /저장 기능이 막혀/u);
    assert.match(await warning.textContent() || '', /이 기기와 브라우저에 선택이 남아 있을 수 있어요/u);
    assert.equal(await page.getByText('이 기기의 기록 모음, 후보 선택, 비교 준비를 모두 지웠어요.', { exact: true }).count(), 0);

    const retryButton = page.getByRole('button', { name: '다시 정리하기', exact: true });
    await expectVisible(retryButton);
    await retryButton.click();
    await expectVisible(page.getByRole('status'));
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal(await page.evaluate(() => window.localStorage.getItem('athletetime.my-athlete.v2')), null);
    visited.push(page.url());
  }, {
    fileName: 'record-device-data-clear-e2e-results.json',
    scenario: 'blocked local record cleanup remains truthful',
    invocation: 'node --test backend/tests/record-device-data-e2e.test.js',
  });
});

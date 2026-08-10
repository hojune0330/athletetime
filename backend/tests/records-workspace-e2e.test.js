const assert = require('node:assert/strict');
const test = require('node:test');
const { expectVisible, navigateToReady, withRecordsPage } = require('./records-flow-e2e-fixture');

test('RECORDS-WORKSPACE-STORAGE-E2E Given blocked browser storage When opening saved-record management Then temporary storage and recovery stay visible', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      const originalGetItem = Storage.prototype.getItem;
      Object.defineProperty(Storage.prototype, 'getItem', {
        configurable: true,
        value(key) {
          if (key === 'athletetime.recordWorkspaces.v1') {
            throw new DOMException('Record workspace storage is blocked.', 'SecurityError');
          }
          return originalGetItem.call(this, key);
        },
      });
    });

    await navigateToReady(page, `${baseUrl}/records/workspaces`, page.locator('[data-workspace-storage-status="volatile"]'));
    const blockedStorageResult = await page.evaluate(() => {
      try {
        window.localStorage.getItem('athletetime.recordWorkspaces.v1');
        return 'available';
      } catch (error) {
        return error instanceof DOMException ? error.name : 'unknown';
      }
    });
    assert.equal(blockedStorageResult, 'SecurityError');
    await expectVisible(page.locator('[data-workspace-storage-status="volatile"]'));
    await expectVisible(page.getByRole('heading', { name: '기기 저장이 일시적으로 안 돼요' }));
    await expectVisible(page.getByText('브라우저가 이 기기의 저장을 허용하지 않았어요.', { exact: true }));
    await page.getByRole('link', { name: '기록 다시 찾기', exact: true }).click();
    await page.waitForURL(/\/records$/u);
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    visited.push(page.url());
  }, {
    fileName: 'workspace-storage-e2e-results.json',
    scenario: 'blocked workspace storage recovery e2e',
    invocation: 'node --test backend/tests/records-workspace-e2e.test.js',
  });
});

test('RECORDS-WORKSPACE-E2E Given a saved record collection When it opens without an event Then its loaded records appear immediately', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript((savedWorkspaces) => {
      window.localStorage.setItem('athletetime.recordWorkspaces.v1', JSON.stringify(savedWorkspaces));
    }, {
      version: 1,
      items: [{
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Alpha 기록 모음',
        subjectKeys: ['aaaaaaaaaaaaaaaa'],
        excludedRecordIds: [],
        filter: {},
        createdAt: '2026-08-09T00:00:00.000Z',
        updatedAt: '2026-08-09T00:00:00.000Z',
      }],
    });

    await navigateToReady(page, `${baseUrl}/records/workspaces/11111111-1111-4111-8111-111111111111`, page.locator('[data-record-row]').first());
    await expectVisible(page.locator('[data-record-row]').first());
    assert.equal(await page.locator('[data-workspace-storage-status="volatile"]').count(), 0, 'working browser storage does not show a recovery warning');
    assert.equal(new URL(page.url()).searchParams.get('event'), null, 'implicit event selection keeps the saved link clean');
    await page.getByRole('button', { name: '종목 목록', exact: true }).click();
    await expectVisible(page.getByText('종목을 고르면', { exact: false }));
    visited.push(page.url());
  });
});

test('RECORDS-ATHLETE-RETURN-E2E Given an in-app candidate When its detail closes Then the original result context returns without entering the share URL', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    const resultsUrl = `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`;
    await navigateToReady(page, resultsUrl, page.getByRole('button', { name: /Alpha Kim 기록 보기/ }));
    await expectVisible(page.getByRole('button', { name: /Alpha Kim 기록 보기/ }));
    await page.getByRole('button', { name: /Alpha Kim 기록 보기/ }).first().click();
    await page.waitForURL(/\/records\/athletes\/alpha-2016/u);
    await expectVisible(page.getByRole('button', { name: '결과로 돌아가기', exact: true }));
    await page.getByRole('button', { name: '결과로 돌아가기', exact: true }).click();
    await page.waitForURL(/\/records\?flow=browse&browse=athlete&q=Alpha/u);
    await expectVisible(page.getByRole('button', { name: /Alpha Kim 기록 보기/ }));
    await navigateToReady(page, `${baseUrl}/records/athletes/alpha-2016`, page.getByRole('button', { name: '기록 찾기', exact: true }));
    await expectVisible(page.getByRole('button', { name: '기록 찾기', exact: true }));
    assert.equal(await page.getByRole('button', { name: '결과로 돌아가기', exact: true }).count(), 0);
    visited.push(page.url());
  });
});

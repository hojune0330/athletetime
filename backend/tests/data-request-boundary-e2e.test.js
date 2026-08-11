const assert = require('node:assert/strict');
const test = require('node:test');

const {
  expectVisible,
  navigateToReady,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

test('CORRECTION-BOUNDARY-E2E Given a 375px visitor submits visible correction context When the receipt opens Then no internal record identifier reaches the request URL, browser storage, or receipt', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    // Given the public form is opened with its only supported prefilled context.
    await page.route('**/api/card-studio/data-requests', async (route) => {
      assert.equal(route.request().method(), 'POST');
      const payload = JSON.parse(route.request().postData() || '{}');
      assert.deepEqual(Object.keys(payload).sort(), [
        'affiliation',
        'athleteName',
        'competition',
        'event',
        'reason',
        'type',
      ]);
      assert.equal(JSON.stringify(payload).includes('SRC-INTERNAL-ONLY'), false);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ticketId: 'DR-2026-9999',
            status: 'received',
            receivedAt: '2026-08-12T01:02:03.000Z',
            message: 'SRC-INTERNAL-ONLY must never be rendered publicly',
          },
        }),
      });
    });
    const requestUrl = `${baseUrl}/data-request?type=correction&athlete=%EA%B0%80%EB%9E%8C`;
    await navigateToReady(page, requestUrl, page.getByRole('button', { name: '요청 접수', exact: true }));
    const requestForm = page.locator('form').filter({ has: page.getByRole('button', { name: '요청 접수', exact: true }) });
    await expectVisible(requestForm);

    // When the visitor completes only the visible human-context fields and submits.
    const inputs = requestForm.locator('input');
    assert.equal(await inputs.nth(0).inputValue(), '가람');
    await inputs.nth(1).fill('서울고');
    await inputs.nth(2).fill('100m');
    await inputs.nth(3).fill('테스트 대회');
    await requestForm.locator('textarea').fill('기록의 소속을 확인해 주세요.');
    await requestForm.getByRole('button', { name: '요청 접수', exact: true }).click();
    await expectVisible(page.getByRole('heading', { name: '요청이 접수되었습니다', exact: true }));

    // Then the receipt exposes its ticket only and client storage has no internal record/source identifier.
    assert.equal(page.url(), requestUrl);
    const publicState = await page.evaluate(() => ({
      local: Object.entries(window.localStorage),
      session: Object.entries(window.sessionStorage),
      text: document.body.textContent || '',
    }));
    const serializedState = JSON.stringify(publicState);
    assert.equal(serializedState.includes('SRC-INTERNAL-ONLY'), false);
    assert.equal(serializedState.includes('public-record-id'), false);
    assert.equal(publicState.text.includes('DR-2026-9999'), true);
    visited.push(page.url());
  }, {
    fileName: 'data-request-boundary-e2e-results.json',
    scenario: '375px correction request preserves the public identifier boundary',
    invocation: 'node --test backend/tests/data-request-boundary-e2e.test.js',
  });
});

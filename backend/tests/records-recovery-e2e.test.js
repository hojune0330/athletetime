const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  expectVisible,
  navigateToReady,
  shouldWriteEvidence,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');
const { createViteStartupLock } = require('./records-flow-e2e-startup-lock');

test('RECORDS-E2E-STARTUP-LOCK Given parallel browser workers When one Vite startup is active Then the next waits until it is released', async () => {
  const lockPath = path.join(os.tmpdir(), `athletetime-records-e2e-${process.pid}-${Date.now()}.lock`);
  const acquire = createViteStartupLock(lockPath, { retryMs: 5, timeoutMs: 1_000, staleMs: 1_000 });
  let releaseFirst = await acquire();
  let releaseSecond;

  try {
    let secondAcquired = false;
    const secondPending = acquire().then((release) => {
      secondAcquired = true;
      return release;
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(secondAcquired, false);

    await releaseFirst();
    releaseFirst = null;
    releaseSecond = await secondPending;
    assert.equal(secondAcquired, true);
  } finally {
    if (releaseFirst) await releaseFirst();
    if (releaseSecond) await releaseSecond();
  }
});

test('RECORDS-FLOW-E2E Given no explicit evidence request Then routine runs do not rewrite tracked evidence', () => {
  assert.equal(shouldWriteEvidence(undefined), false);
  assert.equal(shouldWriteEvidence('true'), false);
  assert.equal(shouldWriteEvidence('1'), true);
});

test('RECORDS-SEARCH-RECOVERY-E2E Given a temporary record-search failure When retrying Then the current query runs again', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    let requestCount = 0;
    await page.route('**/api/card-studio/analytics/records/search**', async (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        return;
      }
      await route.fallback();
    });

    await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`);
    await expectVisible(page.getByRole('alert'));
    await expectVisible(page.getByRole('button', { name: '다시 시도', exact: true }));
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await page.waitForURL(/q=Alpha/u);
    await expectVisible(page.getByRole('button', { name: /Alpha Kim 기록 보기/u }));
    assert.equal(requestCount, 2);
    visited.push(page.url());
  }, {
    fileName: 'record-search-recovery-e2e-results.json',
    scenario: 'temporary record search failure and retry',
    invocation: 'node --test backend/tests/records-recovery-e2e.test.js',
    expectedConsoleErrors: ['Service Unavailable', 'API response error [503]'],
  });
});

test('RECORDS-SEARCH-BUSY-E2E Given a slow public-record search When it waits Then the request state prevents a duplicate submit', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    let searchRequestCount = 0;
    let releaseResponse = () => {};
    const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
    await page.route('**/api/card-studio/analytics/records/search**', async (route) => {
      searchRequestCount += 1;
      if (searchRequestCount > 1) {
        await route.fallback();
        return;
      }
      await responseGate;
      await route.fallback();
    });

    try {
      await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`);
      const searchForm = page.locator('form[aria-busy="true"]');
      await expectVisible(searchForm);
      const statusTexts = await page.locator('[role="status"]').allTextContents();
      assert.ok(
        statusTexts.includes('검색 중이에요. 잠시만 기다려 주세요.'),
        `the pending search should expose an accessible status message; got ${JSON.stringify(statusTexts)}`,
      );
      assert.equal(await page.getByRole('button', { name: '검색 중', exact: true }).isDisabled(), true);

      releaseResponse();
      await expectVisible(page.getByRole('button', { name: /Alpha Kim 기록 보기/u }));
      visited.push(page.url());
    } finally {
      releaseResponse();
    }
  });
});

test('DATA-REQUEST-INTENT-E2E Given a typed request link When the form opens Then it retains only a valid explicit request type', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/data-request?type=deletion&athlete=Alpha%20Kim`);
    const selectedDeletion = page.locator('button[aria-pressed="true"]');
    await expectVisible(selectedDeletion);
    assert.match(await selectedDeletion.textContent() || '', /삭제/u);
    const prefilledAthleteName = await page.locator('textarea').evaluate((textarea) => (
      textarea.closest('form')?.querySelector('input')?.value
    ));
    assert.equal(prefilledAthleteName, 'Alpha Kim');

    await navigateToReady(page, `${baseUrl}/data-request?type=unknown`);
    const selectedCorrection = page.locator('button[aria-pressed="true"]');
    await expectVisible(selectedCorrection);
    assert.match(await selectedCorrection.textContent() || '', /정정/u);
    visited.push(page.url());
  });
});

test('MOBILE-DRAWER-FOCUS-E2E Given the mobile menu opens When using a keyboard Then focus remains in the drawer and Escape restores its trigger', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/records`);
    const trigger = page.locator('button[aria-controls="mobile-navigation-drawer"]').first();
    await trigger.click();
    const drawer = page.locator('#mobile-navigation-drawer');
    const closeButton = drawer.locator('button').first();
    await expectVisible(drawer);
    await page.waitForFunction(() => document.activeElement === document.querySelector('#mobile-navigation-drawer button'));
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await drawer.evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
    assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
    assert.equal(await closeButton.count(), 0);
    visited.push(page.url());
  });
});

test('STALE-COMPARE-LINK-E2E Given unavailable comparison candidates When the shared link opens Then one close action returns to the record hub', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(
      page,
      `${baseUrl}/records?compare=missing-one,missing-two`,
      page.getByText('나란히 볼 기록을 불러오지 못했어요', { exact: true }),
    );
    await expectVisible(page.getByText('나란히 볼 기록을 불러오지 못했어요', { exact: true }));
    const closeButton = page.getByRole('button', { name: '닫기', exact: true });
    const closeButtonBox = await closeButton.boundingBox();
    assert.ok(closeButtonBox && closeButtonBox.height >= 44, 'the recovery action should be touch-safe');
    await closeButton.click();
    await page.waitForURL(/\/records$/u);
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    visited.push(page.url());
  }, {
    expectedConsoleErrors: ['status of 404', 'API response error [404]'],
  });
});

test('STALE-ATHLETE-LINK-E2E Given an unavailable athlete link When it opens Then one action returns to record search', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/records?athlete=missing-one`);
    await expectVisible(page.getByText('링크의 선수를 못 찾았어요', { exact: true }));

    const recoveryAction = page.getByRole('button', { name: '검색 결과 보기', exact: true });
    assert.equal(await recoveryAction.count(), 1, 'the broken-link notice should expose one recovery action');
    const actionBox = await recoveryAction.boundingBox();
    const actionClass = await recoveryAction.getAttribute('class');
    assert.ok(
      actionBox && actionBox.height >= 44,
      `the shared-link recovery action should be touch-safe; rendered ${actionBox?.height}px (${actionClass})`,
    );
    await recoveryAction.click();

    await page.waitForURL(/\/records$/u);
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    visited.push(page.url());
  }, {
    expectedConsoleErrors: ['status of 404', 'API response error [404]'],
  });
});

test('SAME-NAME-COMPARE-E2E Given separate same-name candidates When their comparison link opens Then both remain renderable without browser errors', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/records?compare=alpha-2016,alpha-2020`);
    await expectVisible(page.locator('text=기록 나란히 보기'));
    await expectVisible(page.getByText(/Seoul High/u));
    await expectVisible(page.getByText(/Seoul Track Club/u));
    visited.push(page.url());
  });
});

test('PARTIAL-COMPARE-LINK-E2E Given one unavailable comparison profile When the shared link opens Then available people remain separately usable', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(
      page,
      `${baseUrl}/records?compare=alpha-2016,alpha-2020,missing-one`,
      page.getByText('일부 기록을 불러오지 못했어요', { exact: true }),
    );
    await expectVisible(page.getByText('일부 기록을 불러오지 못했어요', { exact: true }));
    await expectVisible(page.getByText('선택한 기록 1개를 불러오지 못했어요. 불러온 기록만 나란히 보여드려요.', { exact: true }));
    await expectVisible(page.getByText(/Seoul High/u));
    await expectVisible(page.getByText(/Seoul Track Club/u));

    const athleteChips = page.locator('button').filter({ hasText: 'Alpha Kim' });
    assert.equal(await athleteChips.count(), 2);
    for (let index = 0; index < 2; index += 1) {
      const box = await athleteChips.nth(index).boundingBox();
      assert.ok(box && box.height >= 44, 'comparison athlete actions should be touch-safe');
      assert.match(await athleteChips.nth(index).getAttribute('class') || '', /focus-visible/u);
    }
    visited.push(page.url());
  }, {
    expectedConsoleErrors: ['status of 404', 'API response error [404]'],
  });
});

test('ONE-AVAILABLE-COMPARE-LINK-E2E Given one available comparison profile When the shared link opens Then it explains that comparison cannot start yet', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(
      page,
      `${baseUrl}/records?compare=alpha-2016,missing-one`,
      page.getByText('한 명의 기록만 불러왔어요', { exact: true }),
    );
    await expectVisible(page.getByText('한 명의 기록만 불러왔어요', { exact: true }));
    await expectVisible(page.getByText('나란히 보려면 두 명 이상의 기록이 필요해요. 다시 담아 주세요.', { exact: true }));

    const closeButton = page.getByRole('button', { name: '닫기', exact: true });
    const closeButtonBox = await closeButton.boundingBox();
    assert.ok(closeButtonBox && closeButtonBox.height >= 44, 'the recovery action should be touch-safe');
    await closeButton.click();
    await page.waitForURL(/\/records$/u);
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    visited.push(page.url());
  }, {
    expectedConsoleErrors: ['status of 404', 'API response error [404]'],
  });
});

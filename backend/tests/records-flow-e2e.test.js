const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertCountAtLeast,
  expectUrlParam,
  expectVisible,
  navigateToReady,
  selectedCandidateCount,
  shouldWriteEvidence,
  waitForSelectedCandidateCount,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

test('RECORDS-FLOW-E2E Given no explicit evidence request Then routine runs do not rewrite tracked evidence', () => {
  assert.equal(shouldWriteEvidence(undefined), false);
  assert.equal(shouldWriteEvidence('true'), false);
  assert.equal(shouldWriteEvidence('1'), true);
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

    await navigateToReady(page, `${baseUrl}/records/workspaces/11111111-1111-4111-8111-111111111111`);

    await expectVisible(page.locator('[data-record-row]').first());
    assert.equal(new URL(page.url()).searchParams.get('event'), null, 'implicit event selection keeps the saved link clean');
    await page.getByRole('button', { name: '종목 목록', exact: true }).click();
    await expectVisible(page.getByText('종목을 고르면', { exact: false }));
    visited.push(page.url());
  });
});

test('RECORDS-FLOW-E2E Given /records When using Mine, Browse, and shared links Then Track J routing works in a real browser', { timeout: 120_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/records`);
    visited.push(page.url());
    await expectVisible(page.locator('[data-records-flow="hub"]'));
    assert.equal(await page.locator('#records-search').count(), 0, 'hub renders before the search surface');

    await page.getByRole('button', { name: /기록 찾아 모으기/ }).first().click();
    await page.waitForURL(/flow=mine.*step=name|step=name.*flow=mine/);
    await expectVisible(page.locator('[data-records-step="mine-name"]'));
    assert.equal(await page.locator('#mine-records-name').evaluate((element) => document.activeElement === element), false, 'mobile entry waits for the user to focus the search field');
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

    await page.locator('[data-records-step="mine-confirm"] button[aria-pressed]').first().click();
    await page.locator('[data-records-step="mine-confirm"] button[aria-pressed]').first().click();
    await expectVisible(page.getByRole('heading', { name: '선수를 골라주세요.' }));
    assert.equal(
      await page.locator('[data-records-sticky-cta="mine-confirm"] button').count(),
      1,
      'an empty confirmation has one live recovery action',
    );
    await page.getByRole('button', { name: '선수 고르기', exact: true }).click();
    await page.waitForURL(/step=candidates/);
    await expectVisible(page.locator('[data-records-step="mine-candidates"]'));

    await candidateButtons.filter({ hasText: 'Seoul High' }).click();
    await candidateButtons.filter({ hasText: 'Seoul Track Club' }).click();
    await page.locator('[data-records-sticky-cta="mine-candidates"] button').click();
    await page.waitForURL(/step=confirm/);

    await page.locator('[data-records-sticky-cta="mine-confirm"] button').last().click();
    await page.waitForURL(/step=done/);
    await expectVisible(page.locator('[data-records-step="mine-done"]'));
    assert.equal(new URL(page.url()).searchParams.get('mineDraft'), null, 'done step clears draft URL state');

    await page.getByRole('button', { name: 'Seoul High 묶음을 이 목록에서 빼기' }).click();
    await page.getByRole('button', { name: 'Seoul Track Club 묶음을 이 목록에서 빼기' }).click();
    await expectVisible(page.getByRole('heading', { name: '기록 모음이 비었어요.' }));
    assert.equal(
      await page.locator('[data-records-sticky-cta="mine-done"] button').count(),
      1,
      'an empty saved collection has one live recovery action',
    );
    await page.getByRole('button', { name: '기록 담기', exact: true }).click();
    await page.waitForURL(/step=name/);
    await expectVisible(page.locator('#mine-records-name'));
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records?flow=mine&step=name`);
    await page.locator('#mine-records-name').fill('Missing');
    await page.locator('[data-records-sticky-cta="mine-name"] button').click();
    await page.waitForURL(/step=candidates/);
    await expectVisible(page.getByText('아직 찾지 못했어요.', { exact: false }));
    await page.getByRole('button', { name: '검색어 다시 입력', exact: true }).click();
    await page.waitForURL(/step=name/);
    await expectVisible(page.locator('#mine-records-name'));
    visited.push(page.url());

    await page.locator('#mine-records-name').fill('Limit');
    await page.locator('[data-records-sticky-cta="mine-name"] button').click();
    await page.waitForURL(/step=candidates/);
    const limitCandidateButtons = page.locator('[data-records-step="mine-candidates"] button[aria-pressed]');
    await expectVisible(limitCandidateButtons.first());
    assert.equal(await limitCandidateButtons.count(), 7, 'limit scenario renders more candidates than the collection cap');
    for (let index = 0; index < 6; index += 1) {
      await limitCandidateButtons.nth(index).click();
      await waitForSelectedCandidateCount(page, index + 1);
    }
    await expectVisible(page.getByText('한 번에 6명까지 함께 볼 수 있어요.', { exact: false }));
    assert.equal(await limitCandidateButtons.nth(6).isDisabled(), true, 'the seventh candidate is disabled at capacity');
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records?flow=browse`);
    await expectVisible(page.locator('[data-records-flow="browse"]'));
    await expectVisible(page.getByRole('button', { name: /선수 찾기/ }));
    await expectVisible(page.getByRole('button', { name: /소속 통계 보기/ }));
    await expectVisible(page.getByRole('button', { name: /시즌 기록표/ }));
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records?athlete=alpha-2016`);
    await expectVisible(page.locator('text=Alpha Kim'));
    await expectVisible(page.locator('text=기록 한눈에'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'athlete shared link bypasses the hub');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (value) => { window.__copiedRecordLink = value; } },
      });
    });
    await page.getByRole('button', { name: '기록 링크 공유', exact: true }).click();
    await expectVisible(page.getByText('공유 링크를 복사했어요.', { exact: true }));
    const copiedRecordLink = await page.evaluate(() => window.__copiedRecordLink);
    assert.equal(copiedRecordLink, `${baseUrl}/records/athletes/alpha-2016`, 'legacy panel shares the canonical athlete page');
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records/athletes/alpha-2016`);
    await expectVisible(page.locator('[data-record-row]').first());
    await expectVisible(page.getByRole('button', { name: '이 선수 담기', exact: true }));
    await expectVisible(page.getByText('같은 이름의 다른 선수일 수 있어요.', { exact: false }));
    assert.equal(
      await page.getByRole('button', { name: '이 선수 후보 담기', exact: true }).count(),
      0,
      'dedicated athlete action uses the same candidate-selection wording as search',
    );
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records/athletes/missing-athlete`);
    await expectVisible(page.getByRole('heading', { name: '기록을 불러오지 못했어요' }));
    assert.equal(
      await page.getByRole('button', { name: '다시 불러오기', exact: true }).count(),
      1,
      'an unresolved athlete link offers one direct recovery action',
    );
    assert.equal(
      await page.getByRole('link', { name: '기록 검색으로 이동', exact: true }).count(),
      0,
      'an unresolved athlete link does not compete with the retry action',
    );
    visited.push(page.url());

    await navigateToReady(page, `${baseUrl}/records?compare=alpha-2016,beta-2016`);
    await expectVisible(page.locator('text=기록 나란히 보기'));
    assert.equal(await page.locator('[data-records-flow="hub"]').count(), 0, 'compare shared link bypasses the hub');
    visited.push(page.url());
  });
});

test('TEAM-FLOW-E2E Given neutral team browse When searching and opening a team Then real local aggregates preserve URL state', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    // Given team browse starts without silently selecting a team category.
    await navigateToReady(page, `${baseUrl}/records?flow=browse&browse=team`);
    await expectVisible(page.getByRole('heading', { name: '소속의 기록을 숫자로 살펴봐요.' }));
    await expectVisible(page.locator('#records-search'));
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    assert.equal(await page.getByRole('button', { name: '전체', exact: true }).getAttribute('aria-pressed'), 'true');

    // When a real indexed affiliation query is submitted through the browser.
    await page.locator('#records-search').fill('진도');
    await page.getByRole('button', { name: '검색', exact: true }).click();

    // Then teams from different inferred categories remain visible in the neutral result set.
    await expectVisible(page.getByText('개인 기록은 보여주지 않아요.', { exact: false }));
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
    await expectVisible(page.getByText('자료 기준', { exact: false }));
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    assert.equal(new URL(page.url()).searchParams.get('scope'), null, 'team detail starts on the latest observed season');

    // Then period and section changes stay encoded in the shareable URL.
    const allPeriodButton = page.getByRole('button', { name: '전체', exact: true });
    await allPeriodButton.focus();
    assert.equal(await allPeriodButton.evaluate((element) => document.activeElement === element), true);
    assert.match(await allPeriodButton.getAttribute('class') || '', /min-h-11.*focus-visible:ring-2/u);
    await allPeriodButton.click();
    await expectUrlParam(page, 'scope', 'all');
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

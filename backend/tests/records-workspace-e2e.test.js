const assert = require('node:assert/strict');
const test = require('node:test');
const { capturePage } = require('./division-navigation-e2e-capture');
const { getLegacyAliasFixtureMetadata } = require('./records-flow-e2e-data');
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
    await expectVisible(page.getByRole('heading', { name: '이 기기에 저장한 기록 모음을 지금은 유지할 수 없어요' }));
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

test('RECORDS-WORKSPACE-RESET-E2E Given selected candidates When the user clears selection Then the draft is removed before a fresh search opens', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('athletetime.recordWorkspaceDraft.v1', JSON.stringify({
        version: 1,
        subjectKeys: ['aaaaaaaaaaaaaaaa'],
        updatedAt: '2026-08-11T00:00:00.000Z',
      }));
    });

    await navigateToReady(
      page,
      `${baseUrl}/records/workspaces/new`,
      page.getByRole('button', { name: '선택을 비우고 새로 찾기', exact: true }),
    );
    await page.getByRole('button', { name: '선택을 비우고 새로 찾기', exact: true }).click();
    await page.waitForURL(/\/records\?flow=browse&browse=athlete$/u);
    await expectVisible(page.locator('#records-search'));
    assert.equal(
      await page.evaluate(() => window.sessionStorage.getItem('athletetime.recordWorkspaceDraft.v1')),
      null,
    );
    visited.push(page.url());
  }, {
    fileName: 'workspace-reset-e2e-results.json',
    scenario: 'clearing a record workspace draft before a fresh athlete search',
    invocation: 'node --test backend/tests/records-workspace-e2e.test.js',
  });
});

test('RECORDS-WORKSPACE-FINAL-SUBJECT-E2E Given one selected candidate When it is removed Then the draft clears and a fresh search replaces review', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('athletetime.recordWorkspaceDraft.v1', JSON.stringify({
        version: 1,
        subjectKeys: ['aaaaaaaaaaaaaaaa'],
        updatedAt: '2026-08-12T00:00:00.000Z',
      }));
    });

    await navigateToReady(
      page,
      `${baseUrl}/records/workspaces/new`,
      page.getByRole('button', { name: '이 묶음에서 빼기', exact: true }),
    );
    const removeFinalSubject = page.getByRole('button', { name: '이 묶음에서 빼기', exact: true });
    assert.equal(await removeFinalSubject.isEnabled(), true, 'the last selected candidate should remain removable');
    await removeFinalSubject.click();

    await page.waitForURL(/\/records\?flow=browse&browse=athlete$/u);
    await expectVisible(page.locator('#records-search'));
    assert.equal(
      await page.evaluate(() => window.sessionStorage.getItem('athletetime.recordWorkspaceDraft.v1')),
      null,
    );
    visited.push(page.url());
  }, {
    fileName: 'workspace-final-subject-e2e-results.json',
    scenario: 'removing the final record workspace candidate returns to a cleared search',
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

test('RECORDS-LEGACY-ALIAS-E2E Given an ambiguous saved subject and historical record ID When workspace and direct links open Then every candidate persists and the exact record recovers', { timeout: 120_000 }, async () => {
  const fixture = getLegacyAliasFixtureMetadata();
  const captures = [];
  await withRecordsPage(async (state) => {
    const { page, baseUrl, visited } = state;
    await page.addInitScript(({ excludedRecordIdAlias, legacyAlias }) => {
      window.localStorage.setItem('athletetime.recordWorkspaces.v1', JSON.stringify({
        version: 1,
        items: [{
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Legacy recovery fixture',
          subjectKeys: [legacyAlias],
          excludedRecordIds: [excludedRecordIdAlias],
          filter: {},
          createdAt: '2026-08-18T00:00:00.000Z',
          updatedAt: '2026-08-18T00:00:00.000Z',
        }],
      }));
    }, fixture);

    const sameNameWarning = page.getByText('같은 이름의 기록을 함께 보고 있습니다.', { exact: false });
    await navigateToReady(
      page,
      `${baseUrl}/records/workspaces/22222222-2222-4222-8222-222222222222`,
      sameNameWarning,
    );
    await page.waitForFunction((candidateKeys) => {
      const saved = JSON.parse(window.localStorage.getItem('athletetime.recordWorkspaces.v1') || '{}');
      return JSON.stringify(saved.items?.[0]?.subjectKeys) === JSON.stringify(candidateKeys);
    }, fixture.candidateKeys);
    assert.equal(await page.locator(`[data-record-row="${fixture.excludedRecordId}"]`).count(), 0);
    await expectVisible(page.getByText('현재 49개 표시', { exact: false }));
    await capturePage(state, {
      anchor: sameNameWarning,
      captures,
      scenario: 'legacy-alias-saved-exclusion',
    });

    const detailUrl = `${baseUrl}/records/athletes/${fixture.legacyAlias}?record=${fixture.directRecordIdAlias}`;
    const detailHeading = page.getByRole('heading', { name: `${fixture.targetEventLabel} · ${fixture.targetRecord}` });
    await navigateToReady(page, detailUrl, detailHeading);
    await page.waitForURL(new RegExp(`/records/athletes/${fixture.targetAthleteKey}`));
    await expectVisible(detailHeading);
    await capturePage(state, {
      anchor: page.getByRole('dialog'),
      captures,
      scenario: 'legacy-alias-direct-detail',
    });
    visited.push(page.url());
  }, {
    fileName: 'legacy-alias-browser-results.json',
    invocation: 'Node 22.17.1 --test backend/tests/records-workspace-e2e.test.js',
    scenario: 'ambiguous legacy workspace exclusion and exact record detail recovery',
  });
});

test('RECORDS-ATHLETE-RETURN-E2E Given an in-app candidate When its detail closes Then the original result context returns without entering the share URL', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    const resultsUrl = `${baseUrl}/records?flow=browse&browse=athlete&q=Alpha`;
    const alphaCandidate = page.locator('button[data-candidate-key="at_alpha_2016"]');
    await navigateToReady(page, resultsUrl, alphaCandidate);
    await expectVisible(alphaCandidate);
    await alphaCandidate.click();
    await page.waitForURL(/\/records\/athletes\/at_alpha_2016/u);
    await expectVisible(page.getByRole('button', { name: '결과로 돌아가기', exact: true }));
    await page.getByRole('button', { name: '결과로 돌아가기', exact: true }).click();
    await page.waitForURL(/\/records\?flow=browse&browse=athlete&q=Alpha/u);
    await expectVisible(alphaCandidate);
    await navigateToReady(page, `${baseUrl}/records/athletes/at_alpha_2016`, page.getByRole('button', { name: '기록 찾기', exact: true }));
    await expectVisible(page.getByRole('button', { name: '기록 찾기', exact: true }));
    assert.equal(await page.getByRole('button', { name: '결과로 돌아가기', exact: true }).count(), 0);
    visited.push(page.url());
  });
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { expectVisible, navigateToReady, withRecordsPage } = require('./records-flow-e2e-fixture');

test('PACE-CALCULATOR-FIRST-USE-E2E Given a first visit When a runner enters and clears a target Then no sample record remains', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/pace-calculator`, page.getByRole('heading', { name: '목표 페이스 계산기' }));

    const calculateButton = page.getByRole('button', { name: '페이스 계산하기', exact: true });
    const minuteInput = page.getByLabel('분');

    await expectVisible(page.getByText('거리와 목표 시간을 입력하면 계산할 수 있어요.', { exact: true }));
    assert.equal(await calculateButton.isDisabled(), true);
    assert.equal(await page.getByLabel('시간').inputValue(), '');
    assert.equal(await minuteInput.inputValue(), '');
    assert.equal(await page.getByLabel('초').inputValue(), '');

    await page.getByRole('button', { name: '5km', exact: true }).click();
    await minuteInput.fill('20');
    assert.equal(await calculateButton.isDisabled(), false);

    await calculateButton.click();
    await expectVisible(page.getByRole('heading', { name: '계산 결과' }));

    await page.getByRole('button', { name: '초기화', exact: true }).click();
    await expectVisible(page.getByText('거리와 목표 시간을 입력하면 계산할 수 있어요.', { exact: true }));
    assert.equal(await calculateButton.isDisabled(), true);
    assert.equal(await minuteInput.inputValue(), '');
    visited.push(page.url());
  }, { fileName: 'pace-calculator-first-use-e2e-results.json', scenario: 'pace calculator first-use and reset' });
});

test('PACE-CHART-EXPORT-E2E Given a pace chart When PNG and PDF are saved Then both downloads contain the expected file format', { timeout: 120_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(
      page,
      `${baseUrl}/pace-calculator`,
      page.getByRole('heading', { name: '목표 페이스 계산기' }),
    );
    await page.getByRole('tab', { name: /페이스 차트/u }).click();
    await expectVisible(page.getByRole('heading', { name: '러닝 페이스 차트' }));

    const downloads = [
      {
        button: 'PNG 저장',
        fileName: '페이스_거리별_예상시간.png',
        signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      },
      {
        button: 'PDF 저장',
        fileName: '페이스_거리별_예상시간.pdf',
        signature: Buffer.from('%PDF-'),
      },
    ];

    for (const expected of downloads) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: expected.button, exact: true }).first().click(),
      ]);
      assert.equal(download.suggestedFilename(), expected.fileName);
      const downloadedPath = await download.path();
      assert.ok(downloadedPath, `${expected.button} should create a local download`);
      assert.deepEqual(fs.readFileSync(downloadedPath).subarray(0, expected.signature.length), expected.signature);
    }
    visited.push(page.url());
  }, { fileName: 'pace-chart-export-e2e-results.json', scenario: 'pace chart PNG and PDF export' });
});

test('TRAINING-CALCULATOR-FIRST-USE-E2E Given a first visit When a runner has not entered a real performance Then generation stays unavailable until direct input and reset returns to empty', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl, visited }) => {
    await navigateToReady(page, `${baseUrl}/training-calculator`, page.getByRole('heading', { name: '훈련 페이스 계산기' }));

    const createButton = page.getByRole('button', { name: '훈련 계획 생성', exact: true });
    const hourInput = page.getByRole('spinbutton', { name: '시', exact: true });
    const minuteInput = page.getByRole('spinbutton', { name: '분', exact: true });
    const secondInput = page.getByRole('spinbutton', { name: '초', exact: true });

    assert.equal(await createButton.isDisabled(), true);
    assert.equal(await hourInput.inputValue(), '');
    assert.equal(await minuteInput.inputValue(), '');
    assert.equal(await secondInput.inputValue(), '');
    assert.equal(await page.getByText('분석 결과', { exact: true }).count(), 0);

    await page.getByRole('button', { name: '남성', exact: true }).click();
    await page.getByLabel('종목').selectOption('5000');
    await minuteInput.fill('20');
    assert.equal(await createButton.isDisabled(), false);

    await createButton.click();
    await expectVisible(page.getByText('분석 결과', { exact: true }));

    await page.getByRole('button', { name: '다시 입력하기', exact: true }).click();
    await expectVisible(page.getByRole('heading', { name: '훈련 페이스 계산기' }));
    assert.equal(await createButton.isDisabled(), true);
    assert.equal(await hourInput.inputValue(), '');
    assert.equal(await minuteInput.inputValue(), '');
    assert.equal(await secondInput.inputValue(), '');
    assert.equal(await page.getByText('분석 결과', { exact: true }).count(), 0);
    visited.push(page.url());
  }, { fileName: 'training-calculator-first-use-e2e-results.json', scenario: 'training calculator direct input and reset' });
});

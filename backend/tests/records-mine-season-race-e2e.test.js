const assert = require('node:assert/strict');
const test = require('node:test');
const {
  expectVisible,
  navigateToReady,
  withRecordsPage,
} = require('./records-flow-e2e-fixture');

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

test('MINE-SEASON-RACE Given profile resolves before filters When season view opens Then athlete tuple reaches URL before table request', { timeout: 90_000 }, async () => {
  await withRecordsPage(async ({ page, baseUrl }) => {
    // Given a saved synthetic candidate and independently gated profile/filter responses.
    await page.addInitScript(() => {
      localStorage.setItem('athletetime.my-athlete.v2', JSON.stringify([{
        athleteKey: 'mine-race-2016',
        name: 'Race Runner',
        team: 'Race High',
        savedAt: '2026-08-15T00:00:00.000Z',
      }]));
    });
    const filtersSeen = deferred();
    const releaseFilters = deferred();
    const profileSeen = deferred();
    const releaseProfile = deferred();
    await page.route('**/api/card-studio/analytics/filters', async (route) => {
      filtersSeen.resolve();
      await releaseFilters.promise;
      await route.fallback();
    });
    await page.route('**/api/card-studio/analytics/athletes/mine-race-2016', async (route) => {
      profileSeen.resolve();
      await releaseProfile.promise;
      await route.fallback();
    });
    const seasonRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.pathname.endsWith('/analytics/season-records')) return;
      seasonRequests.push({
        season: url.searchParams.get('season'),
        eventKey: url.searchParams.get('eventKey'),
        divisionKey: url.searchParams.get('divisionKey'),
      });
    });

    await navigateToReady(
      page,
      `${baseUrl}/records?flow=mine&step=done&keep=1`,
      page.locator('[data-records-step="mine-done"]'),
    );
    await filtersSeen.promise;
    const openSeason = page.getByRole('button', { name: '시즌 기록표 보기', exact: true });
    await expectVisible(openSeason);

    try {
      // When the Mine action starts and the profile resolves before filters.
      await openSeason.click();
      await profileSeen.promise;
      assert.equal(new URL(page.url()).searchParams.get('flow'), 'mine');
      const profileResponse = page.waitForResponse((response) => (
        response.url().includes('/analytics/athletes/mine-race-2016')
      ));
      releaseProfile.resolve();
      await profileResponse;
      assert.equal(new URL(page.url()).searchParams.get('flow'), 'mine');
      const filtersResponse = page.waitForResponse((response) => (
        response.url().includes('/analytics/filters')
      ));
      releaseFilters.resolve();
      await filtersResponse;

      // Then navigation and every table request use the athlete-derived tuple.
      await page.waitForURL(/flow=browse.*browse=season|browse=season.*flow=browse/u);
      await expectVisible(page.locator('#season-records-event'));
      await page.waitForFunction(() => document.querySelectorAll('#season-record-results tbody tr').length > 0);
      const params = new URL(page.url()).searchParams;
      assert.equal(params.get('season'), '2026');
      assert.equal(params.get('event'), '200m');
      assert.equal(params.get('division'), 'men-all');
      assert.equal(params.get('keep'), '1');
      assert.equal(await page.locator('#season-records-event').inputValue(), '200m');
      assert.equal(await page.locator('#season-records-division').inputValue(), 'all');
      assert.ok(seasonRequests.length > 0);
      assert.ok(seasonRequests.every((request) => (
        request.season === '2026'
        && request.eventKey === '200m'
        && request.divisionKey === 'men-all'
      )));
    } finally {
      releaseProfile.resolve();
      releaseFilters.resolve();
    }
  });
});

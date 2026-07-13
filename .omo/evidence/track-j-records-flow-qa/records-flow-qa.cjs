const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const evidenceDir = __dirname;
const baseUrl = 'http://127.0.0.1:4173';
const viewport = { width: 375, height: 667 };
const mobileTabBarHeight = 56;
const mobileTabBarClearance = 8;

const filters = {
  seasons: [2026, 2025],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [
    { key: 'men-high', label: '남자 고등부', gender: 'men', level: 'high' },
    { key: 'men-all', label: '남자 전체', gender: 'men', level: 'all' },
  ],
  genderOptions: [{ key: 'men', label: '남자' }, { key: 'women', label: '여자' }],
  levelOptions: [{ key: 'all', label: '전체' }, { key: 'high', label: '고등부' }],
  defaultSeasonSelection: {
    season: 2026,
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    genderKey: 'men',
    divisionLevel: 'high',
    rowCount: 18,
  },
};

const athletes = [
  athlete('kim-mj-2016', '김민준', '서울고', [2024, 2025, 2026], ['100m', '200m'], 7),
  athlete('kim-mj-2020', '김민준', '서울체고', [2025, 2026], ['100m'], 4),
  athlete('park-js-2016', '박준서', '부산고', [2024, 2026], ['100m'], 5),
];

function athlete(athleteKey, name, team, years, events, recordCount) {
  return {
    athleteKey,
    name,
    team,
    teams: [team],
    years,
    events,
    divisions: ['남자 고등부'],
    recordCount,
    ambiguity: 'name_team',
    note: '',
  };
}

function makeRecord(item, index) {
  return {
    id: `${item.athleteKey}-${index}`,
    athleteKey: item.athleteKey,
    name: item.name,
    team: item.team,
    season: 2026,
    competitionName: '전국 육상 테스트 대회',
    date: `2026-04-${String(index + 10).padStart(2, '0')}`,
    venue: '목포종합운동장',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: null,
    rawDivision: '남자 고등부',
    phase: 'final',
    record: index === 0 ? '10.91' : '11.04',
    recordValue: index === 0 ? 10.91 : 11.04,
    direction: 'lower',
    rank: index + 1,
    wind: '+0.7',
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'athletetime_fixture',
      sourceType: 'qa_fixture',
      sourceId: `qa-${item.athleteKey}`,
      sourceUrl: '',
      capturedAt: '2026-07-13T00:00:00.000Z',
    },
  };
}

function makeProfile(key) {
  const item = athletes.find((candidate) => candidate.athleteKey === key) || athletes[0];
  const records = [makeRecord(item, 0), makeRecord(item, 1)];
  return {
    athlete: item,
    summary: {
      indexedBest: records[0],
      seasonBest: records[0],
      latest: records[1],
      delta: null,
      indexedResultCount: records.length,
      comparableResultCount: records.length,
      sourceScope: 'qa_fixture',
      disclaimer: 'QA fixture',
    },
    events: [{ eventKey: '100m', eventLabel: '100m', recordCount: records.length, best: records[0] }],
    recordTrail: records.map((record) => ({
      id: record.id,
      date: record.date,
      season: record.season,
      value: record.recordValue,
      record: record.record,
      eventLabel: record.eventLabel,
      competitionName: record.competitionName,
      isComparable: record.isComparable,
    })),
    records,
  };
}

const seasonTable = {
  season: 2026,
  eventKey: '100m',
  divisionKey: 'men-high',
  eventLabel: '100m',
  divisionLabel: '남자 고등부',
  totalIndexedAthletes: 2,
  rows: athletes.slice(0, 2).map((item, index) => ({
    rank: index + 1,
    athleteKey: item.athleteKey,
    name: item.name,
    team: item.team,
    record: index === 0 ? '10.91' : '11.04',
    recordValue: index === 0 ? 10.91 : 11.04,
    date: '2026-04-10',
    competitionName: '전국 육상 테스트 대회',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    divisionLevel: 'high',
    divisionDetail: null,
    wind: '+0.7',
    windLegal: true,
    highlighted: index === 0,
  })),
  filters,
  disclaimer: 'QA fixture',
};

async function fulfillJson(route, data) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
}

async function installApiMocks(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname.endsWith('/analytics/filters')) return fulfillJson(route, { success: true, data: filters });
    if (pathname.endsWith('/analytics/records/search')) return fulfillJson(route, { success: true, total: athletes.length, data: athletes });
    if (pathname.includes('/analytics/athletes/')) return fulfillJson(route, { success: true, data: makeProfile(decodeURIComponent(pathname.split('/').pop())) });
    if (pathname.endsWith('/analytics/season-records')) return fulfillJson(route, { success: true, data: seasonTable });
    if (pathname.endsWith('/analytics/insights')) {
      return fulfillJson(route, {
        success: true,
        data: {
          generatedAt: '2026-07-13T00:00:00.000Z',
          scope: 'qa_fixture',
          privacy: { includesNames: false, includesTeams: false, includesAthleteKeys: false, minGroupSize: 3 },
          season: 2026,
          eventConcentration: [{ eventKey: '100m', eventLabel: '100m', recordCount: 22, athleteCount: 12 }],
          regionActivity: [
            { regionCode: 'seoul', regionLabel: 'Seoul', recordCount: 12, eventCount: 3 },
            { regionCode: 'busan', regionLabel: 'Busan', recordCount: 7, eventCount: 2 },
          ],
          seasonPulse: {
            windowDays: 28,
            from: '2026-06-01',
            to: '2026-06-28',
            buckets: [
              { weekStart: '2026-06-01', weekEnd: '2026-06-07', recordCount: 3 },
              { weekStart: '2026-06-08', weekEnd: '2026-06-14', recordCount: 9 },
            ],
          },
        },
      });
    }
    return fulfillJson(route, { success: true, data: null });
  });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: true });
  const consoleErrors = [];
  const pageErrors = [];
  const captures = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installApiMocks(page);

  async function capture(id, ctaSelector, expectedText) {
    await page.waitForLoadState('networkidle').catch(() => {});
    if (expectedText) {
      await page.locator(`text=${expectedText}`).first().waitFor({ state: 'visible', timeout: 5000 });
    }
    const screenshot = path.join(evidenceDir, `${id}-375x667.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    let cta = null;
    if (ctaSelector) {
      const locator = page.locator(ctaSelector).first();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      const box = await locator.boundingBox();
      cta = box ? {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        fullyVisibleInViewport: box.y >= 0 && box.x >= 0 && box.y + box.height <= viewport.height && box.x + box.width <= viewport.width,
        notCoveredByMobileTabBar: box.y + box.height <= viewport.height - mobileTabBarHeight - mobileTabBarClearance,
      } : null;
    }
    captures.push({ id, url: page.url(), screenshot: path.relative(root, screenshot), ctaSelector, cta });
  }

  await page.goto(`${baseUrl}/records`, { waitUntil: 'networkidle' });
  await capture('hub', 'text=내 기록 찾기', '내 기록, 이름만 알면 찾아요.');

  await page.goto(`${baseUrl}/records?flow=mine&step=name`, { waitUntil: 'networkidle' });
  await capture('mine-a1-name', '[data-records-sticky-cta="mine-name"]', '선수 이름을 입력하세요.');
  await page.locator('#mine-records-name').fill('김민준');
  await page.getByRole('button', { name: '내 기록 찾기' }).click();
  await page.waitForURL(/step=candidates/);
  await page.locator('[data-records-step="mine-candidates"] [aria-pressed]').nth(0).click();
  await page.locator('[data-records-step="mine-candidates"] [aria-pressed]').nth(1).click();
  await capture('mine-a2-candidates-selected', '[data-records-sticky-cta="mine-candidates"]', '후보에서 내 기록을 고르세요.');

  await page.goBack();
  await page.waitForURL(/step=name/);
  const backNavigationStep = await page.locator('[data-records-step="mine-name"]').count();
  await page.goForward();
  await page.waitForURL(/step=candidates/);
  await page.getByRole('button', { name: /2개 선택됨 · 다음/ }).click();
  await page.waitForURL(/step=confirm/);
  await capture('mine-a3-confirm', '[data-records-sticky-cta="mine-confirm"]', '같은 사람 묶음을 확인하세요.');
  await page.getByRole('button', { name: '이대로 합치기' }).click();
  await page.waitForURL(/step=done/);
  await capture('mine-a4-done', '[data-records-sticky-cta="mine-done"]', '내 기록 홈이 준비됐어요.');

  await page.goto(`${baseUrl}/records?flow=browse`, { waitUntil: 'networkidle' });
  await capture('browse-b0-gateway', 'text=선수 찾기', '무엇을 볼까요?');

  await page.goto(`${baseUrl}/records?athlete=kim-mj-2016`, { waitUntil: 'networkidle' });
  await page.locator('text=김민준').first().waitFor({ state: 'visible', timeout: 5000 });
  const athleteBypass = {
    hubCount: await page.locator('[data-records-flow="hub"]').count(),
    profileTextVisible: await page.locator('text=기록 한눈에').first().isVisible().catch(() => false),
  };
  await capture('deeplink-athlete', null, '기록 한눈에');

  await page.goto(`${baseUrl}/records?compare=kim-mj-2016,park-js-2016`, { waitUntil: 'networkidle' });
  await page.locator('text=기록 나란히 보기').first().waitFor({ state: 'visible', timeout: 5000 });
  const compareBypass = {
    hubCount: await page.locator('[data-records-flow="hub"]').count(),
    compareTextVisible: await page.locator('text=기록 나란히 보기').first().isVisible().catch(() => false),
  };
  await capture('deeplink-compare', null, '기록 나란히 보기');

  const summary = {
    generatedAt: new Date().toISOString(),
    viewport,
    captures,
    checks: {
      backNavigationReturnedToNameStep: backNavigationStep > 0,
      athleteDeepLinkBypassesHub: athleteBypass.hubCount === 0 && athleteBypass.profileTextVisible,
      compareDeepLinkBypassesHub: compareBypass.hubCount === 0 && compareBypass.compareTextVisible,
      allMeasuredCtasFullyVisible: captures.filter((item) => item.ctaSelector).every((item) => item.cta?.fullyVisibleInViewport === true && item.cta?.notCoveredByMobileTabBar === true),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
    },
    consoleErrors,
    pageErrors,
  };

  fs.writeFileSync(path.join(evidenceDir, 'records-flow-375x667-qa.json'), JSON.stringify(summary, null, 2));
  await browser.close();

  if (!summary.checks.backNavigationReturnedToNameStep ||
      !summary.checks.athleteDeepLinkBypassesHub ||
      !summary.checks.compareDeepLinkBypassesHub ||
      !summary.checks.allMeasuredCtasFullyVisible ||
      consoleErrors.length ||
      pageErrors.length) {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(summary.checks, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

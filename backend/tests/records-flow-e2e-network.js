const assert = require('node:assert/strict');
const {
  filters,
  getSearchResults,
  getSeasonRecordsResponse,
  getTeamSearchResponse,
  makeInsights,
  makeProfile,
} = require('./records-flow-e2e-data');

async function installApiMocks(state, teamApiBaseUrl) {
  const appOrigin = new URL(state.baseUrl).origin;
  state.page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === appOrigin) return;
    const observation = response.serverAddr().then((serverAddress) => {
      if (serverAddress) {
        state.externalNetworkRequests.push({ url: url.href, serverAddress });
      }
    });
    state.externalObservationTasks.push(observation);
  });
  await state.page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== appOrigin) {
      await interceptExternalRequest(route, state);
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    state.apiRequests.push(url.pathname + url.search);
    await fulfillApi(route, url, teamApiBaseUrl);
  });
}

async function waitForExternalObservations(state) {
  await Promise.all(state.externalObservationTasks);
}

function assertExternalNetworkIsolation(state) {
  assert.ok(state.externalAttempts.length >= 2, 'external stylesheets should be observed');
  assert.equal(state.externalInterceptions.length, state.externalAttempts.length);
  assert.ok(state.externalInterceptions.every(({ action }) => (
    action === 'fulfilled-empty-stylesheet' || action === 'aborted-before-network'
  )));
  assert.deepEqual(state.externalNetworkRequests, []);
  return {
    viewport: state.viewport,
    externalAttempts: state.externalAttempts.length,
    externalInterceptions: state.externalInterceptions.length,
    externalNetworkRequests: state.externalNetworkRequests.length,
  };
}

async function interceptExternalRequest(route, state) {
  const request = route.request();
  const url = new URL(request.url());
  const resourceType = request.resourceType();
  const attempt = {
    url: url.href,
    method: request.method(),
    resourceType,
  };
  state.externalAttempts.push(attempt);
  const isStylesheet = resourceType === 'stylesheet' || url.pathname.endsWith('.css');
  if (isStylesheet) {
    state.externalInterceptions.push({ ...attempt, action: 'fulfilled-empty-stylesheet' });
    await route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' });
    return;
  }
  state.externalInterceptions.push({ ...attempt, action: 'aborted-before-network' });
  await route.abort('blockedbyclient');
}

async function fulfillApi(route, url, teamApiBaseUrl) {
  const pathname = url.pathname;
  if (pathname.endsWith('/analytics/record-workspaces/preview')) {
    const response = await route.fetch({ url: `${teamApiBaseUrl}${pathname}${url.search}` });
    return route.fulfill({ response });
  }
  if (pathname.endsWith('/analytics/teams/search')) {
    const response = getTeamSearchResponse(url.searchParams);
    if (response) return fulfillJson(route, response.body, response.status);
  }
  if (pathname.includes('/analytics/teams')) {
    const response = await route.fetch({ url: `${teamApiBaseUrl}${pathname}${url.search}` });
    return route.fulfill({ response });
  }
  if (pathname.endsWith('/analytics/filters')) {
    return fulfillJson(route, { success: true, data: filters });
  }
  if (pathname.endsWith('/analytics/popular-events')) {
    return fulfillJson(route, {
      success: true,
      data: {
        season: 2026,
        events: filters.events.map((event) => ({
          ...event,
          recordCount: 12,
          athleteCount: 7,
        })),
        note: 'QA fixture',
      },
    });
  }
  if (pathname.endsWith('/analytics/records/search')) {
    const query = url.searchParams.get('q') || '';
    const results = getSearchResults(query);
    return fulfillJson(route, { success: true, total: results.length, data: results });
  }
  if (pathname.includes('/analytics/athletes/')) {
    const key = decodeURIComponent(pathname.split('/').pop() || '');
    const profile = makeProfile(key);
    if (!profile) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Not found' }),
      });
      return;
    }
    return fulfillJson(route, { success: true, data: profile });
  }
  if (pathname.endsWith('/analytics/season-records')) {
    const response = getSeasonRecordsResponse(url.searchParams);
    return fulfillJson(route, response.body, response.status);
  }
  if (pathname.endsWith('/analytics/insights')) {
    return fulfillJson(route, { success: true, data: makeInsights() });
  }
  if (pathname.endsWith('/api/chat/check-nickname')) {
    return fulfillJson(route, {
      success: true,
      available: true,
      message: '사용할 수 있는 닉네임이에요.',
    });
  }
  return fulfillJson(route, { success: true, data: null });
}

async function fulfillJson(route, data, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

module.exports = {
  assertExternalNetworkIsolation,
  installApiMocks,
  waitForExternalObservations,
};

const assert = require('node:assert/strict');
const test = require('node:test');
const { EditorialNewsDiscoveryRepository } = require('../../card-studio/repositories/editorialNewsDiscoveryRepository');
const { EditorialNewsDiscoveryService } = require('../../card-studio/services/editorialNewsDiscoveryService');
const {
  ACTOR_ID, applyEditorialMigrations, connectionString, createExistingFixture, isolatedPool,
} = require('./helpers/communityEditorialPostgresHarness');

test('NEWS-RUNTIME-PG-001: concurrent workers share one run and completed reruns do not insert', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_runtime'); await createExistingFixture(pool); await applyEditorialMigrations(pool);
  const repository = new EditorialNewsDiscoveryRepository(pool);
  let calls = 0;
  const provider = { async search() {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 40));
    return { items: [{ title: '육상 대회 결과', originallink: 'https://example.com/result', link: 'https://naver.example/result', pubDate: '2026-07-26T00:00:00Z' }] };
  } };
  const service = new EditorialNewsDiscoveryService({ repository, provider, profiles: ['korean-athletics'] });

  // When
  const [left, right] = await Promise.all([
    service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' }),
    service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' }),
  ]);
  const rerun = await service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' });

  // Then
  assert.equal(calls, 1);
  assert.equal(left.id, right.id); assert.equal(rerun.id, left.id);
  const runs = await pool.query('SELECT count(*)::int AS count FROM editorial_news_runs');
  const discoveries = await pool.query('SELECT count(*)::int AS count FROM editorial_news_discoveries');
  const runHistory = await service.listRuns({ limit: 10 });
  assert.equal(runs.rows[0].count, 1); assert.equal(discoveries.rows[0].count, 1);
  assert.equal(runHistory.length, 1); assert.equal(runHistory[0].id, left.id);
});

test('NEWS-RUNTIME-PG-002: transitions are forward-only and retained dismissed rows purge after 90 days', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_runtime_state'); await createExistingFixture(pool); await applyEditorialMigrations(pool);
  const repository = new EditorialNewsDiscoveryRepository(pool);
  const service = new EditorialNewsDiscoveryService({ repository, profiles: ['korean-athletics'], provider: { async search() { return { items: [{ title: '육상 소식', originallink: 'https://example.com/state', link: 'https://naver.example/state', pubDate: '2026-07-26T00:00:00Z' }] }; } } });
  await service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' });
  await pool.query('UPDATE editorial_news_discoveries SET published_at=NOW()');
  const page = await service.listDiscoveries();
  const currentMonth = await service.listDiscoveries({ range: 'month' });

  // When
  await service.transitionDiscovery({ id: page.discoveries[0].id, actorUserId: ACTOR_ID, status: 'dismissed', reviewNote: 'Not applicable' });
  await assert.rejects(
    service.transitionDiscovery({ id: page.discoveries[0].id, actorUserId: ACTOR_ID, status: 'reviewing' }),
    { code: 'NEWS_DISCOVERY_TRANSITION_INVALID' },
  );
  await pool.query(`UPDATE editorial_news_discoveries
    SET first_seen_at=NOW()-INTERVAL '92 days', last_seen_at=NOW()-INTERVAL '91 days'
    WHERE id=$1`, [page.discoveries[0].id]);
  const removed = await service.purgeExpired();

  // Then
  assert.equal(currentMonth.discoveries.length, 1);
  assert.equal(removed, 1);
  const events = await pool.query('SELECT event_type FROM editorial_news_events ORDER BY id');
  assert.deepEqual(events.rows.map((row) => row.event_type), ['run_started', 'run_completed', 'status_changed', 'purged']);
  await assert.rejects(pool.query("UPDATE editorial_news_events SET event_type='purged' WHERE id=1"), /immutable/u);
});

test('NEWS-RUNTIME-PG-003: completed run history purges after 13 months without deleting discoveries', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_runtime_retention'); await createExistingFixture(pool); await applyEditorialMigrations(pool);
  const repository = new EditorialNewsDiscoveryRepository(pool);
  const service = new EditorialNewsDiscoveryService({ repository, profiles: ['korean-athletics'], provider: { async search() { return { items: [{ title: '육상 보존', originallink: 'https://example.com/retention', link: 'https://naver.example/retention', pubDate: '2026-07-26T00:00:00Z' }] }; } } });
  const run = await service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' });
  await pool.query("UPDATE editorial_news_runs SET completed_at=NOW()-INTERVAL '14 months' WHERE id=$1", [run.id]);

  // When
  const removed = await service.purgeRuns();

  // Then
  assert.equal(removed, 1);
  const discovery = await pool.query('SELECT first_seen_run_id FROM editorial_news_discoveries');
  const events = await pool.query('SELECT count(*)::int AS count FROM editorial_news_events');
  assert.equal(discovery.rows[0].first_seen_run_id, null);
  assert.equal(events.rows[0].count, 0);
});

test('NEWS-SOURCE-LINK-PG-001: confirmed source links one planned calendar without creating publication sources', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_source_link'); await createExistingFixture(pool); await applyEditorialMigrations(pool);
  const repository = new EditorialNewsDiscoveryRepository(pool);
  const provider = { async search() { return { items: [
    { title: '육상 원출처 하나', originallink: 'https://example.com/one', link: 'https://naver.example/one', pubDate: '2026-07-26T00:00:00Z' },
    { title: '육상 원출처 둘', originallink: 'https://example.com/two', link: 'https://naver.example/two', pubDate: '2026-07-26T00:00:00Z' },
  ] }; } };
  const service = new EditorialNewsDiscoveryService({ repository, provider, profiles: ['korean-athletics'], resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }] });
  await service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' });
  const discoveries = (await service.listDiscoveries()).discoveries;
  for (const discovery of discoveries) {
    await service.transitionDiscovery({ id: discovery.id, actorUserId: ACTOR_ID, status: 'reviewing' });
    await service.confirmSource({ id: discovery.id, actorUserId: ACTOR_ID, sourceUrl: 'https://example.com/original', title: 'Editor confirmed source', publisher: 'Example', sourceKind: 'secondary' });
  }
  const calendarId = '30000000-0000-4000-8000-000000000001';
  await pool.query(`INSERT INTO editorial_calendar (id, season_year, section_key, slot, state) VALUES ($1,2026,'competition-preview',1,'planned')`, [calendarId]);

  // When
  const first = await service.linkCalendar({ id: discoveries[0].id, actorUserId: ACTOR_ID, calendarId, expectedCalendarVersion: 1 });
  const second = service.linkCalendar({ id: discoveries[1].id, actorUserId: ACTOR_ID, calendarId, expectedCalendarVersion: 1 });

  // Then
  assert.equal(first.status, 'calendar_linked');
  await assert.rejects(second, { code: 'NEWS_DISCOVERY_CALENDAR_LINKED' });
  const persisted = await pool.query('SELECT status, confirmed_source_title, confirmed_source_publisher, confirmed_source_kind FROM editorial_news_discoveries WHERE id=$1', [discoveries[0].id]);
  const calendar = await pool.query('SELECT state, version FROM editorial_calendar WHERE id=$1', [calendarId]);
  const sources = await pool.query('SELECT count(*)::int AS count FROM editorial_sources');
  const secondState = await pool.query('SELECT status FROM editorial_news_discoveries WHERE id=$1', [discoveries[1].id]);
  const audit = await pool.query("SELECT count(*)::int AS count FROM editorial_news_events WHERE metadata->>'to'='calendar_linked'");
  assert.deepEqual(persisted.rows[0], { status: 'calendar_linked', confirmed_source_title: 'Editor confirmed source', confirmed_source_publisher: 'Example', confirmed_source_kind: 'secondary' });
  assert.deepEqual(calendar.rows[0], { state: 'planned', version: 1 });
  assert.equal(sources.rows[0].count, 0);
  assert.equal(secondState.rows[0].status, 'source_confirmed');
  assert.equal(audit.rows[0].count, 1);
});

test('NEWS-RUNTIME-PG-004: failed-run restarts keep a persistent daily provider budget', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_persistent_budget');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  let networkCalls = 0;
  const provider = {
    async search({ reserveCall }) {
      await reserveCall();
      networkCalls += 1;
      const error = Object.assign(new Error('provider unavailable'), { code: 'HTTP_500', apiCallCount: 1 });
      throw error;
    },
  };

  // When
  let finalRun;
  for (let attempt = 0; attempt < 41; attempt += 1) {
    const service = new EditorialNewsDiscoveryService({
      repository: new EditorialNewsDiscoveryRepository(pool),
      provider,
      profiles: ['korean-athletics'],
    });
    finalRun = await service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' });
  }

  // Then
  assert.equal(networkCalls, 40);
  assert.equal(finalRun.safeErrorCode, 'quota_exceeded');
  assert.equal(finalRun.apiCallCount, 40);
  const persisted = await pool.query(
    "SELECT api_call_count FROM editorial_news_runs WHERE run_date_kst='2026-07-26'",
  );
  assert.equal(persisted.rows[0].api_call_count, 40);
});

test('NEWS-RUNTIME-PG-005: monthly provider budget survives later-day process restarts', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_monthly_budget');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  await pool.query(`INSERT INTO editorial_news_runs (
    id, run_date_kst, profile_version, trigger, status, completed_at,
    api_call_count, safe_error_code, actor_user_id
  ) VALUES (
    '40000000-0000-4000-8000-000000000001','2026-07-01','prior-budget',
    'manual','failed',NOW(),800,'partial_failure',$1
  )`, [ACTOR_ID]);
  let networkCalls = 0;
  const provider = {
    async search({ reserveCall }) {
      await reserveCall();
      networkCalls += 1;
      return { items: [], apiCallCount: 1 };
    },
  };
  const service = new EditorialNewsDiscoveryService({
    repository: new EditorialNewsDiscoveryRepository(pool),
    provider,
    profiles: ['korean-athletics'],
    env: {},
  });

  // When
  const run = await service.runManual({
    actorUserId: ACTOR_ID,
    runDateKst: '2026-07-26',
  });

  // Then
  assert.equal(networkCalls, 0);
  assert.equal(run.status, 'failed');
  assert.equal(run.safeErrorCode, 'quota_exceeded');
  assert.equal(run.apiCallCount, 0);
});

test('NEWS-RUNTIME-PG-006: concurrent waiters share one failed provider attempt but a later retry is explicit', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_failed_waiters');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const repository = new EditorialNewsDiscoveryRepository(pool);
  let calls = 0;
  const provider = {
    async search() {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
      throw Object.assign(new Error('provider unavailable'), { code: 'HTTP_500', apiCallCount: 1 });
    },
  };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics'],
  });

  // When
  const [left, right] = await Promise.all([
    service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' }),
    service.runManual({ actorUserId: ACTOR_ID, runDateKst: '2026-07-26' }),
  ]);
  const retry = await service.runManual({
    actorUserId: ACTOR_ID,
    runDateKst: '2026-07-26',
  });

  // Then
  assert.equal(left.id, right.id);
  assert.equal(left.status, 'failed');
  assert.equal(right.status, 'failed');
  assert.equal(retry.id, left.id);
  assert.equal(calls, 2);
});

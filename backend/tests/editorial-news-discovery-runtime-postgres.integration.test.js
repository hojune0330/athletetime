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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const {
  ACTOR_ID,
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  isolatedPool,
  newsEventDownMigrationPath,
  newsEventMigrationPath,
  newsDiscoveryDownMigrationPath,
  newsDiscoveryMigrationPath,
} = require('./helpers/communityEditorialPostgresHarness');

test('NEWS-DISCOVERY-MIGRATION-001: migration applies, rolls back, and reapplies in isolation', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'news_discovery_migration');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);

  // When
  const runId = '10000000-0000-4000-8000-000000000011';
  await pool.query(`
    INSERT INTO editorial_news_runs (
      id, run_date_kst, profile_version, trigger, status, completed_at, actor_user_id
    ) VALUES ($1, DATE '2026-07-26', 'v1', 'manual', 'completed', NOW(), $2)
  `, [runId, ACTOR_ID]);
  await pool.query(`
    INSERT INTO editorial_news_discoveries (
      id, canonical_url_hash, original_url, title, published_at, first_seen_run_id,
      query_keys, relevance_score, relevance_tags
    ) VALUES (
      '20000000-0000-4000-8000-000000000011',
      repeat('a', 64),
      'https://example.com/athletics/result',
      '육상 경기 결과',
      NOW(),
      $1,
      '["korean-athletics"]'::jsonb,
      80,
      '["competition"]'::jsonb
    )
  `, [runId]);

  // Then
  const inserted = await pool.query(`
    SELECT status, title FROM editorial_news_discoveries
    WHERE canonical_url_hash = repeat('a', 64)
  `);
  assert.deepEqual(inserted.rows, [{ status: 'discovered', title: '육상 경기 결과' }]);
  await assert.rejects(
    pool.query(`
      UPDATE editorial_news_discoveries
      SET status = 'calendar_linked'
      WHERE canonical_url_hash = repeat('a', 64)
    `),
    /editorial_news_discoveries_check/u,
  );

  await pool.query(fs.readFileSync(newsEventDownMigrationPath, 'utf8'));
  await pool.query(fs.readFileSync(newsDiscoveryDownMigrationPath, 'utf8'));
  const retained = await pool.query(`SELECT to_regclass('editorial_calendar') AS table_name`);
  assert.equal(retained.rows[0].table_name, 'editorial_calendar');
  const removed = await pool.query(`SELECT to_regclass('editorial_news_runs') AS table_name`);
  assert.equal(removed.rows[0].table_name, null);

  await pool.query(fs.readFileSync(newsDiscoveryMigrationPath, 'utf8'));
  await pool.query(fs.readFileSync(newsEventMigrationPath, 'utf8'));
  const reapplied = await pool.query(`SELECT to_regclass('editorial_news_runs') AS table_name`);
  assert.equal(reapplied.rows[0].table_name, 'editorial_news_runs');
});

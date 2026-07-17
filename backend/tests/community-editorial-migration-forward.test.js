const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { checksum, listMigrationFiles, runMigrations } = require('../database/run-migrations');
const {
  connectionString,
  createExistingFixture,
  isolatedPool,
  root,
} = require('./helpers/communityEditorialPostgresHarness');

const migration006 = path.join(root, 'backend/database/migration-006-community-editorial.sql');
const migration007 = path.join(root, 'backend/database/migration-007-community-editorial-api.sql');
const APPLIED_006_CHECKSUM = '5cd4f8fb07bd62c5f492cd9df5184b39d4029052a49fa444da3ad4580ea0d9d1';

test('EDITORIAL-MIGRATION-001: applied migration 006 remains immutable and 007 is forward-only', () => {
  assert.equal(checksum(fs.readFileSync(migration006, 'utf8')), APPLIED_006_CHECKSUM);
  assert.equal(fs.existsSync(migration007), true);
  assert.equal(listMigrationFiles(path.dirname(migration007)).includes(path.basename(migration007)), true);
});

test('EDITORIAL-MIGRATION-002: an old 006 database upgrades through 007 and restarts cleanly', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_forward');
  await createExistingFixture(pool);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-editorial-forward-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.copyFileSync(migration006, path.join(directory, path.basename(migration006)));

  const initial = await runMigrations({ pool, directory });
  assert.deepEqual(initial.applied, [path.basename(migration006)]);
  fs.copyFileSync(migration007, path.join(directory, path.basename(migration007)));

  const upgraded = await runMigrations({ pool, directory });
  const restarted = await runMigrations({ pool, directory });
  assert.deepEqual(upgraded.applied, [path.basename(migration007)]);
  assert.deepEqual(restarted.applied, []);
  const slug = await pool.query(`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='editorial_issues' AND column_name='slug'
  `);
  assert.deepEqual(slug.rows, [{ is_nullable: 'NO' }]);
  const calendarEvents = await pool.query(`
    SELECT event_type FROM editorial_calendar_events WHERE false
  `);
  assert.equal(calendarEvents.rowCount, 0);
});

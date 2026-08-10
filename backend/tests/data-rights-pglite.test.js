const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { checksum, runMigrations } = require('../database/run-migrations');

const ROOT = path.join(__dirname, '..', '..');
const DATABASE_DIRECTORY = path.join(ROOT, 'backend', 'database');
const REPORT_MIGRATIONS = [
  'migration-006a-legacy-reports-isolation.sql',
  'migration-007-chat.sql',
  'migration-008-chat-reports-repair.sql',
];

function migrationDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-report-migrations-'));
  for (const name of REPORT_MIGRATIONS) {
    fs.copyFileSync(path.join(DATABASE_DIRECTORY, name), path.join(directory, name));
  }
  t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  return directory;
}

async function database(t) {
  const instance = new PGlite();
  t.after(() => instance.close());
  return instance;
}

function pool(instance) {
  return {
    connect: async () => ({
      query: async (sql, parameters) => {
        if (sql.includes('pg_advisory_xact_lock')) return { rowCount: 1, rows: [] };
        if (!parameters && (sql.trim().startsWith('DO $$') || sql.includes('CREATE TABLE IF NOT EXISTS chat_messages'))) {
          await instance.exec(sql);
          return { rowCount: 0, rows: [] };
        }
        const result = await instance.query(sql, parameters);
        const rowCount = /^\s*select\b/i.test(sql) ? result.rows.length : result.affectedRows ?? result.rows.length;
        return { rowCount, rows: result.rows };
      },
      release() {},
    }),
  };
}

async function seedLedger(instance) {
  const sql = fs.readFileSync(path.join(DATABASE_DIRECTORY, 'migration-007-chat.sql'), 'utf8');
  await instance.exec(`
    CREATE TABLE athletetime_migrations (
      name TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await instance.query(
    'INSERT INTO athletetime_migrations (name, checksum) VALUES ($1, $2)',
    ['migration-007-chat.sql', checksum(sql)],
  );
}

async function seedLegacyReports(instance) {
  await instance.exec(`
    CREATE TABLE users (id UUID PRIMARY KEY);
    CREATE TABLE posts (id BIGSERIAL PRIMARY KEY);
    CREATE TABLE comments (id BIGSERIAL PRIMARY KEY);
    CREATE TABLE reports (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
      comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reason VARCHAR(50) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
      admin_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMPTZ
    );
    CREATE INDEX idx_reports_post_id ON reports(post_id);
    CREATE INDEX idx_reports_comment_id ON reports(comment_id);
    CREATE INDEX idx_reports_user_id ON reports(user_id);
    CREATE INDEX idx_reports_status ON reports(status);
    CREATE FUNCTION update_reports_count() RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER reports_count_trigger AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION update_reports_count();
    INSERT INTO users VALUES ('00000000-0000-0000-0000-000000000001');
    INSERT INTO posts DEFAULT VALUES;
    INSERT INTO comments DEFAULT VALUES;
    INSERT INTO reports (post_id, comment_id, user_id, reason) VALUES (1, 1, '00000000-0000-0000-0000-000000000001', 'preserve-me');
  `);
}

async function seedChatReports(
  instance,
  targetCheck = "target_type IN ('post', 'comment', 'chat')",
  idDefinition = 'BIGSERIAL PRIMARY KEY',
) {
  await instance.exec(`
    CREATE TABLE reports (
      id ${idDefinition},
      target_type VARCHAR(16) NOT NULL CHECK (${targetCheck}),
      target_id VARCHAR(64) NOT NULL,
      reporter_anonymous_id VARCHAR(255) NOT NULL,
      reason_code VARCHAR(32) NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (target_type, target_id, reporter_anonymous_id)
    );
  `);
}

function bootstrapReportsSql() {
  const schema = fs.readFileSync(path.join(DATABASE_DIRECTORY, 'schema-fixed.sql'), 'utf8');
  const start = schema.indexOf('CREATE TABLE reports');
  const end = schema.indexOf('-- ============================================', start + 1);
  assert.ok(start >= 0 && end > start, 'reports bootstrap block must exist');
  return schema.slice(start, end);
}

test('REPORTS-PGLITE-001: Given legacy reports and recorded 007 When migrating Then legacy rows and chat reports both remain usable', async (t) => {
  const instance = await database(t);
  await seedLegacyReports(instance);
  await seedLedger(instance);

  const result = await runMigrations({ directory: migrationDirectory(t), pool: pool(instance) });

  assert.deepEqual(result.applied, [
    'migration-006a-legacy-reports-isolation.sql',
    'migration-008-chat-reports-repair.sql',
  ]);
  assert.deepEqual((await instance.query('SELECT reason FROM legacy_community_reports')).rows, [{ reason: 'preserve-me' }]);
  await instance.query("INSERT INTO reports (target_type, target_id, reporter_anonymous_id, reason_code) VALUES ('chat', 'message-1', 'anonymous-1', 'spam')");
});

test('REPORTS-PGLITE-002: Given recorded 007 without reports When migrating Then 008 creates chat reports', async (t) => {
  const instance = await database(t);
  await instance.exec('CREATE TABLE users (id UUID PRIMARY KEY)');
  await seedLedger(instance);

  const result = await runMigrations({ directory: migrationDirectory(t), pool: pool(instance) });

  assert.deepEqual(result.applied, [
    'migration-006a-legacy-reports-isolation.sql',
    'migration-008-chat-reports-repair.sql',
  ]);
  await instance.query("INSERT INTO reports (target_type, target_id, reporter_anonymous_id, reason_code) VALUES ('chat', 'message-2', 'anonymous-2', 'spam')");
});

test('REPORTS-PGLITE-003: Given an expanded chat target check When migrating Then it fails closed', async (t) => {
  const instance = await database(t);
  await seedChatReports(instance, "target_type IN ('post', 'comment', 'chat', 'system')");

  await assert.rejects(runMigrations({ directory: migrationDirectory(t), pool: pool(instance) }), /Unrecognized reports table/i);
  assert.equal((await instance.query("SELECT to_regclass('reports') AS name")).rows[0].name, 'reports');
});

test('REPORTS-PGLITE-004: Given a partial same-name index When repairing Then it fails closed', async (t) => {
  const instance = await database(t);
  await seedChatReports(instance);
  await instance.exec('CREATE INDEX reports_target_idx ON reports (target_type, target_id) WHERE false');

  await assert.rejects(instance.exec(fs.readFileSync(path.join(DATABASE_DIRECTORY, 'migration-008-chat-reports-repair.sql'), 'utf8')), /Unrecognized reports_target_idx/i);
});

test('REPORTS-PGLITE-005: Given a chat-shaped table without an owned id sequence When migrating Then it fails closed', async (t) => {
  const instance = await database(t);
  await instance.exec('CREATE TABLE users (id UUID PRIMARY KEY)');
  await seedLedger(instance);
  await seedChatReports(instance, "target_type IN ('post', 'comment', 'chat')", 'BIGINT NOT NULL DEFAULT 1 PRIMARY KEY');

  await assert.rejects(runMigrations({ directory: migrationDirectory(t), pool: pool(instance) }), /Unrecognized reports table/i);
  assert.deepEqual((await instance.query('SELECT name FROM athletetime_migrations')).rows, [{ name: 'migration-007-chat.sql' }]);
});

test('REPORTS-PGLITE-006: Given a partial legacy index When isolating reports Then it fails closed', async (t) => {
  const instance = await database(t);
  await seedLegacyReports(instance);
  await instance.exec('DROP INDEX idx_reports_post_id; CREATE INDEX idx_reports_post_id ON reports (post_id) WHERE false');

  await assert.rejects(instance.exec(fs.readFileSync(path.join(DATABASE_DIRECTORY, 'migration-006a-legacy-reports-isolation.sql'), 'utf8')), /Unrecognized reports indexes or triggers/i);
});

test('REPORTS-PGLITE-007: Given bootstrap reports SQL When inserting a chat report Then no legacy trigger runs', async (t) => {
  const instance = await database(t);

  await instance.exec(bootstrapReportsSql());
  await instance.query("INSERT INTO reports (target_type, target_id, reporter_anonymous_id, reason_code) VALUES ('chat', 'message-3', 'anonymous-3', 'spam')");
  assert.deepEqual((await instance.query('SELECT target_type FROM reports')).rows, [{ target_type: 'chat' }]);
});

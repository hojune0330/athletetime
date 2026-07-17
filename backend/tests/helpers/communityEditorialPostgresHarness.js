const crypto = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');

const root = path.join(__dirname, '..', '..', '..');
const migrationPath = path.join(root, 'backend', 'database', 'migration-006-community-editorial.sql');
const downMigrationPath = path.join(
  root,
  'backend',
  'database',
  'rollbacks',
  '006-community-editorial-down.sql',
);
const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const expectedTables = Object.freeze([
  'editorial_calendar',
  'editorial_issues',
  'editorial_sources',
  'editorial_revisions',
  'editorial_events',
  'magazine_digest_preferences',
  'event_alert_subscriptions',
  'issue_engagement_daily',
  'post_quarantines',
]);

async function isolatedPool(t, prefix) {
  const schema = `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
  const adminPool = new Pool({ connectionString, ssl: false, max: 2, connectionTimeoutMillis: 5000 });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString,
    ssl: false,
    max: 4,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    options: `-c search_path=${schema}`,
  });
  t.after(async () => {
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await adminPool.end();
  });
  return pool;
}

async function createExistingFixture(pool) {
  await pool.query(`
    CREATE TABLE users (id UUID PRIMARY KEY, username VARCHAR(50) NOT NULL);
    CREATE TABLE categories (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE);
    CREATE TABLE posts (
      id BIGSERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      author VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255),
      instagram VARCHAR(50),
      is_notice BOOLEAN DEFAULT FALSE,
      is_admin BOOLEAN DEFAULT FALSE,
      is_blinded BOOLEAN DEFAULT FALSE,
      is_pinned BOOLEAN DEFAULT FALSE,
      blind_reason VARCHAR(100),
      views INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      dislikes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      reports_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMPTZ,
      search_vector TSVECTOR
    );
    CREATE TABLE competitions (id BIGSERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL);
    INSERT INTO users (id, username)
      VALUES ('00000000-0000-4000-8000-000000000001', 'editorial-admin');
    INSERT INTO posts (title, content, author) VALUES ('fixture title', 'fixture content', 'fixture author');
    INSERT INTO competitions (name) VALUES ('fixture competition');
  `);
}

module.exports = {
  connectionString,
  createExistingFixture,
  downMigrationPath,
  expectedTables,
  isolatedPool,
  migrationPath,
  root,
};

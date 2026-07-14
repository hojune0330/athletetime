const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATION_PATTERN = /^migration-(\d{3})[^/]*\.sql$/;
const FIRST_MANAGED_MIGRATION = 4;

function listMigrationFiles(directory = __dirname) {
  return fs.readdirSync(directory)
    .filter((name) => {
      const match = name.match(MIGRATION_PATTERN);
      return match && Number.parseInt(match[1], 10) >= FIRST_MANAGED_MIGRATION;
    })
    .sort();
}

function checksum(sql) {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

async function runMigrations({ pool, directory = __dirname } = {}) {
  if (!pool) throw new Error('A PostgreSQL pool is required');
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('athletetime_migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS athletetime_migrations (
        name TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const name of listMigrationFiles(directory)) {
      const sql = fs.readFileSync(path.join(directory, name), 'utf8');
      const digest = checksum(sql);
      const existing = await client.query(
        'SELECT checksum FROM athletetime_migrations WHERE name = $1',
        [name],
      );

      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== digest) {
          throw new Error(`Applied migration checksum mismatch: ${name}`);
        }
        continue;
      }

      await client.query(sql);
      await client.query(
        'INSERT INTO athletetime_migrations (name, checksum) VALUES ($1, $2)',
        [name, digest],
      );
      applied.push(name);
    }

    await client.query('COMMIT');
    return { applied, total: listMigrationFiles(directory).length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required');
  const pool = new Pool({ connectionString, ssl: false });
  try {
    const result = await runMigrations({ pool });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { checksum, listMigrationFiles, runMigrations };

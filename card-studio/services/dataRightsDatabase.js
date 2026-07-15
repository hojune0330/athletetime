const { Pool } = require('pg');
const { postgresSslConfig } = require('../../backend/database/postgres-ssl');

function connectionString() {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }
  return process.env.DATABASE_URL || '';
}

function usesPostgres() {
  return connectionString().length > 0;
}

function createPool(url) {
  return new Pool({
    connectionString: url,
    ssl: postgresSslConfig(),
    max: 10,
    connectionTimeoutMillis: 3000,
  });
}

module.exports = { connectionString, createPool, usesPostgres };

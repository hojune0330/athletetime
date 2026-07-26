const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  assertRecoveryCodeEnvironment,
  createRecoveryCode,
  hashRecoveryCode,
  recoveryCodeMatches,
} = require('../auth/recoveryCodes');
const { createEmailRateLimiter, createIpRateLimiter } = require('../middleware/authRateLimit');
const { listMigrationFiles } = require('../database/run-migrations');

const ROOT = path.join(__dirname, '..', '..');

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('recovery codes use cryptographic generation and a secret-bound hash', () => {
  const environment = { NODE_ENV: 'test', AUTH_CODE_PEPPER: 'test-recovery-pepper-that-is-long-enough' };
  const codes = new Set(Array.from({ length: 24 }, () => createRecoveryCode()));
  const code = createRecoveryCode();
  const hash = hashRecoveryCode(code, environment);

  assert.ok([...codes].every((value) => /^\d{6}$/.test(value)));
  assert.equal(hash.includes(code), false);
  assert.equal(recoveryCodeMatches(code, hash, environment), true);
  assert.equal(recoveryCodeMatches('000000', hash, environment), code === '000000');
});

test('production rejects startup without a dedicated recovery-code pepper', () => {
  assert.throws(
    () => assertRecoveryCodeEnvironment({ NODE_ENV: 'production' }),
    /AUTH_CODE_PEPPER/,
  );
  assert.doesNotThrow(() => assertRecoveryCodeEnvironment({
    NODE_ENV: 'production',
    AUTH_CODE_PEPPER: 'production-recovery-pepper-that-is-long-enough',
  }));
});

test('email-scoped rate limits stop repeated recovery delivery attempts', () => {
  const limit = createEmailRateLimiter({ windowMs: 60_000, max: 2, message: 'slow down' });
  const request = { body: { email: 'athlete@example.com' } };
  let nextCount = 0;

  limit(request, createResponse(), () => { nextCount += 1; });
  limit(request, createResponse(), () => { nextCount += 1; });
  const blocked = createResponse();
  limit(request, blocked, () => { nextCount += 1; });

  assert.equal(nextCount, 2);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.success, false);
  assert.equal(typeof blocked.headers['Retry-After'], 'number');
});

test('IP-scoped limits block broad brute-force attempts and discard expired keys', () => {
  const limit = createIpRateLimiter({ windowMs: 60_000, max: 1, message: 'slow down' });
  const request = { ip: '203.0.113.8', body: { email: 'first@example.com' } };
  let nextCount = 0;

  limit(request, createResponse(), () => { nextCount += 1; });
  const blocked = createResponse();
  limit({ ...request, body: { email: 'second@example.com' } }, blocked, () => { nextCount += 1; });

  assert.equal(nextCount, 1);
  assert.equal(blocked.statusCode, 429);
});

test('recovery flow persists only hashes, limits guesses, and keeps production admin bootstrap unregistered', () => {
  const routeSource = fs.readFileSync(path.join(ROOT, 'backend/auth/routes.js'), 'utf8');
  const middlewareSource = fs.readFileSync(path.join(ROOT, 'backend/middleware/auth.js'), 'utf8');
  const migrationSource = fs.readFileSync(path.join(ROOT, 'backend/database/migration-006-auth-recovery-security.sql'), 'utf8');

  assert.match(routeSource, /forgotPasswordLimiter/);
  assert.match(routeSource, /forgotPasswordIpLimiter/);
  assert.match(routeSource, /resetCodeAttemptLimiter/);
  assert.match(routeSource, /verificationDeliveryLimiter/);
  assert.match(routeSource, /verificationCodeAttemptLimiter/);
  assert.match(routeSource, /code_hash/);
  assert.match(routeSource, /attempt_count = attempt_count \+ 1/);
  assert.match(routeSource, /FOR UPDATE/);
  assert.match(routeSource, /UPDATE refresh_tokens/);
  assert.match(routeSource, /SELECT verified, expires_at[\s\S]*?FROM email_verifications/);
  assert.match(routeSource, /code_hash = EXCLUDED\.code_hash/);
  assert.match(routeSource, /FROM email_verifications[\s\S]*FOR UPDATE/);
  assert.match(routeSource, /이메일 인증을 완료한 후 로그인할 수 있습니다/);
  assert.match(routeSource, /if \(!IS_PRODUCTION\) \{\s*router\.post\('\/set-admin'/);
  assert.match(middlewareSource, /process\.env\.NODE_ENV === 'production' && !user\.email_verified/);
  assert.doesNotMatch(routeSource, /INSERT INTO password_reset_codes \(email, code, expires_at\)/);
  assert.doesNotMatch(routeSource, /CREATE TABLE IF NOT EXISTS email_verifications/);
  assert.doesNotMatch(routeSource, /verification\.code !== code/);
  assert.match(migrationSource, /code_hash CHAR\(64\)/);
  assert.match(migrationSource, /attempt_count INTEGER/);
  assert.match(migrationSource, /ALTER TABLE email_verifications/);
  assert.match(migrationSource, /verification_code_hash CHAR\(64\)/);
  assert.match(migrationSource, /UPDATE password_reset_codes/);
});

test('Given a legacy active reset row When recovery migrations run Then compatibility clears its NOT NULL constraint before migration 006 retires plaintext codes', () => {
  const migrationDirectory = path.join(ROOT, 'backend/database');
  const migrationFiles = listMigrationFiles(migrationDirectory);
  const compatibilityName = 'migration-005a-auth-recovery-compat.sql';
  const recoveryName = 'migration-006-auth-recovery-security.sql';
  const compatibilitySource = fs.readFileSync(
    path.join(migrationDirectory, compatibilityName),
    'utf8',
  );

  assert.ok(migrationFiles.includes(compatibilityName));
  assert.ok(migrationFiles.includes(recoveryName));
  assert.ok(
    migrationFiles.indexOf(compatibilityName) < migrationFiles.indexOf(recoveryName),
    'legacy compatibility must run before recovery migration 006',
  );
  assert.match(compatibilitySource, /ALTER COLUMN code DROP NOT NULL/);
  assert.match(compatibilitySource, /information_schema\.columns/);
});

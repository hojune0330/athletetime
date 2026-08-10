const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('CHAT-REPORT-STORAGE-001: legacy community reports are preserved before chat reports are created', () => {
  const isolation = readSource('backend/database/migration-006a-legacy-reports-isolation.sql');
  const migration = readSource('backend/database/migration-007-chat.sql');
  const legacySchema = readSource('backend/database/schema-fixed.sql');

  assert.match(legacySchema, /CREATE TABLE reports \(/);
  assert.match(isolation, /ALTER TABLE reports RENAME TO legacy_community_reports/);
  assert.match(isolation, /Unrecognized reports table; refusing to replace it/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reports \(/);
  assert.match(migration, /UNIQUE \(target_type, target_id, reporter_anonymous_id\)/);
});

test('CHAT-REPORT-STORAGE-002: chat moderation keeps using the dedicated chat report schema', () => {
  const router = readSource('backend/routes/chat.js');

  assert.match(router, /INSERT INTO reports \(target_type, target_id/);
  assert.match(router, /FROM reports r/);
  assert.match(router, /WHERE r\.target_type = 'chat'/);
});

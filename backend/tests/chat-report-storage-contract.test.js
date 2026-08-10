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
  const repair = readSource('backend/database/migration-008-chat-reports-repair.sql');
  const bootstrapSchema = readSource('backend/database/schema-fixed.sql');

  assert.match(bootstrapSchema, /target_type VARCHAR\(16\) NOT NULL/);
  assert.doesNotMatch(bootstrapSchema, /CREATE INDEX idx_reports_post_id/);
  assert.doesNotMatch(bootstrapSchema, /reports_count_trigger/);
  assert.match(isolation, /current_schema\(\)/);
  assert.match(isolation, /ALTER TABLE %I\.%I RENAME TO %I/);
  assert.match(isolation, /ALTER SEQUENCE %I\.%I RENAME TO %I/);
  assert.match(isolation, /COUNT\(\*\) = 10/);
  assert.match(isolation, /reports_count_trigger/);
  assert.match(isolation, /expected_chat_check/);
  assert.match(isolation, /expected_legacy_status_check/);
  assert.match(isolation, /Unrecognized reports table; refusing to replace it/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reports \(/);
  assert.match(repair, /current_schema\(\)/);
  assert.match(repair, /Unrecognized reports table; refusing to repair it/);
  assert.match(repair, /reports_target_idx/);
  assert.match(repair, /reports_created_idx/);
  assert.match(migration, /UNIQUE \(target_type, target_id, reporter_anonymous_id\)/);
});

test('CHAT-REPORT-STORAGE-002: chat moderation keeps using the dedicated chat report schema', () => {
  const router = readSource('backend/routes/chat.js');

  assert.match(router, /INSERT INTO reports \(target_type, target_id/);
  assert.match(router, /FROM reports r/);
  assert.match(router, /WHERE r\.target_type = 'chat'/);
});

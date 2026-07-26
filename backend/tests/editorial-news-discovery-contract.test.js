const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { listMigrationFiles } = require('../database/run-migrations');

const ROOT = path.join(__dirname, '..', '..');
const UP_PATH = path.join(
  ROOT,
  'backend/database/migration-011-editorial-news-discovery.sql',
);
const DOWN_PATH = path.join(
  ROOT,
  'backend/database/rollbacks/011-editorial-news-discovery-down.sql',
);
const CONTRACT_PATH = path.join(
  ROOT,
  'docs/athletetime-naver-news-discovery-contract.md',
);

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('NEWS-DISCOVERY-CONTRACT-001: migration creates separate run and discovery ledgers', () => {
  // Given / When
  const sql = read(UP_PATH);

  // Then
  assert.match(sql, /CREATE TABLE IF NOT EXISTS editorial_news_runs/u);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS editorial_news_discoveries/u);
  assert.match(sql, /UNIQUE\s*\(run_date_kst,\s*profile_version\)/u);
  assert.match(sql, /canonical_url_hash CHAR\(64\) NOT NULL UNIQUE/u);
  assert.match(sql, /CHECK\s*\(status IN \('discovered',\s*'reviewing',\s*'source_confirmed',\s*'calendar_linked',\s*'dismissed',\s*'expired'\)\)/u);
  assert.match(sql, /linked_calendar_id UUID REFERENCES editorial_calendar\(id\)/u);
});

test('NEWS-DISCOVERY-CONTRACT-002: migration cannot persist article content or credentials', () => {
  // Given / When
  const sql = read(UP_PATH);

  // Then
  for (const forbidden of [
    'description',
    'article_body',
    'raw_response',
    'api_key',
    'authorization_header',
    'cookie',
  ]) {
    assert.doesNotMatch(sql, new RegExp(`\\b${forbidden}\\b`, 'iu'), forbidden);
  }
  assert.doesNotMatch(sql, /ALTER TABLE editorial_sources/iu);
  assert.doesNotMatch(sql, /INSERT INTO editorial_sources/iu);
});

test('NEWS-DISCOVERY-CONTRACT-003: rollback is isolated from existing editorial data', () => {
  // Given / When
  const sql = read(DOWN_PATH);

  // Then
  assert.match(sql, /DROP TABLE IF EXISTS editorial_news_discoveries/u);
  assert.match(sql, /DROP TABLE IF EXISTS editorial_news_runs/u);
  assert.doesNotMatch(sql, /DROP TABLE IF EXISTS editorial_(calendar|issues|sources|events)/u);
});

test('NEWS-DISCOVERY-CONTRACT-004: ADR keeps discovery separate from publication evidence', () => {
  // Given / When
  const contract = read(CONTRACT_PATH);

  // Then
  for (const required of [
    '발행 근거가 아니다',
    'editorial_news_discoveries',
    'editorial_sources',
    '자동 초안',
    '자동 승인',
    '자동 발행',
    '14일',
    'NAVER_NEWS_COLLECTOR_ENABLED=false',
  ]) {
    assert.match(contract, new RegExp(required, 'u'), required);
  }
});

test('NEWS-DISCOVERY-CONTRACT-005: public editorial router has no discovery surface', () => {
  // Given
  const routes = read('backend/routes/editorialAdmin.js');
  const publicRouter = routes.slice(routes.indexOf('function createEditorialPublicRouter'));

  // When / Then
  assert.doesNotMatch(publicRouter, /news-discover/iu);
  assert.doesNotMatch(publicRouter, /review_note|reviewed_by|actor_user_id/iu);
});

test('NEWS-DISCOVERY-CONTRACT-006: migration runner discovers migration 011 but not its rollback', () => {
  // Given / When
  const migrations = listMigrationFiles(path.join(ROOT, 'backend/database'));

  // Then
  assert.equal(migrations.includes('migration-011-editorial-news-discovery.sql'), true);
  assert.equal(migrations.includes('migration-012-editorial-news-discovery-events.sql'), true);
  assert.equal(migrations.includes('migration-013-editorial-news-confirmed-source.sql'), true);
  assert.equal(migrations.some((name) => name.includes('down')), false);
});

test('NEWS-DISCOVERY-CONTRACT-007: managed migration does not depend on unmanaged auth tables', () => {
  // Given / When
  const sql = read(UP_PATH);

  // Then
  assert.doesNotMatch(sql, /REFERENCES users/u);
  assert.match(sql, /actor_user_id UUID/u);
  assert.match(sql, /reviewed_by UUID/u);
});

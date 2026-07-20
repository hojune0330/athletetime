const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  enqueueEditorialPublishJob,
} = require('../../card-studio/repositories/editorialPublishJobRepository');

const ROOT = path.join(__dirname, '..', '..');
const migrationPath = path.join(
  ROOT,
  'backend/database/migration-010-editorial-publish-jobs.sql',
);
const rollbackPath = path.join(
  ROOT,
  'backend/database/rollbacks/010-editorial-publish-jobs-down.sql',
);

test('EDITORIAL-SCHEDULER-CONTRACT-001: Given migration 010 When inspected Then jobs are persistent and rollback is scoped', () => {
  // Given
  assert.equal(fs.existsSync(migrationPath), true);
  assert.equal(fs.existsSync(rollbackPath), true);

  // When
  const up = fs.readFileSync(migrationPath, 'utf8');
  const down = fs.readFileSync(rollbackPath, 'utf8');

  // Then
  assert.match(up, /CREATE TABLE IF NOT EXISTS editorial_publish_jobs/u);
  assert.match(up, /UNIQUE\s*\(issue_id\)/u);
  assert.match(up, /queued[\s\S]*retrying[\s\S]*failed[\s\S]*completed/u);
  assert.match(up, /attempt_count/u);
  assert.match(up, /next_attempt_at/u);
  assert.match(up, /last_error_code/u);
  assert.match(down, /DROP TABLE IF EXISTS editorial_publish_jobs/u);
  assert.doesNotMatch(down, /DROP TABLE IF EXISTS editorial_issues/u);
  assert.doesNotMatch(down, /DROP TABLE IF EXISTS posts/u);
});

test('EDITORIAL-SCHEDULER-CONTRACT-002: Given a scheduled issue When enqueued again Then one job is reset inside the caller transaction', async () => {
  // Given
  const queries = [];
  const client = {
    async query(text, values) {
      queries.push({ text, values });
      return { rowCount: 1, rows: [{ id: values[0] }] };
    },
  };
  const input = {
    issueId: '10000000-0000-4000-8000-000000000001',
    scheduledFor: '2026-08-01T00:00:00.000Z',
  };

  // When
  await enqueueEditorialPublishJob(client, input);

  // Then
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /INSERT INTO editorial_publish_jobs/u);
  assert.match(queries[0].text, /ON CONFLICT \(issue_id\) DO UPDATE/u);
  assert.match(queries[0].text, /status = 'queued'/u);
  assert.match(queries[0].text, /attempt_count = 0/u);
  assert.match(queries[0].text, /last_error_code = NULL/u);
  assert.equal(queries[0].values[1], input.issueId);
  assert.equal(queries[0].values[2], input.scheduledFor);
});

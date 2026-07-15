const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  checkReadiness,
  checkRequestRoundTrip,
  compareShadowSuppressions,
  createBackupManifest,
  verifyBackupManifest,
} = require('../../tools/data-rights-rollout');
const {
  assertManifestPath,
  assertShadowEnvironment,
} = require('../../tools/check-data-rights-rollout');

test('RIGHTS-ROLLOUT-001: backup manifest detects unchanged and changed artifacts', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-backup-'));
  const backup = path.join(directory, 'rights.dump.enc');
  fs.writeFileSync(backup, 'encrypted-backup');
  const now = new Date('2026-07-15T00:00:00.000Z');
  fs.utimesSync(backup, now, now);
  const manifest = createBackupManifest(backup, now);

  assert.deepEqual(verifyBackupManifest(backup, manifest, { now }), {
    valid: true,
    bytes: 16,
    ageHours: 0,
  });
  fs.writeFileSync(backup, 'tampered-backup!');
  assert.throws(
    () => verifyBackupManifest(backup, manifest, { now }),
    /Backup artifact checksum mismatch/,
  );
});

test('RIGHTS-ROLLOUT-002: stale backup manifests fail closed', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-stale-'));
  const backup = path.join(directory, 'rights.dump.enc');
  fs.writeFileSync(backup, 'encrypted-backup');
  const recordedAt = new Date('2026-07-13T00:00:00.000Z');
  fs.utimesSync(backup, recordedAt, recordedAt);
  const manifest = createBackupManifest(backup, recordedAt);

  assert.throws(() => verifyBackupManifest(backup, manifest, {
    now: new Date('2026-07-15T00:00:00.000Z'),
    maxAgeHours: 24,
  }), /Backup manifest is older than 24 hours/);
});

test('RIGHTS-ROLLOUT-002B: re-recording an old backup does not make it fresh', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-old-artifact-'));
  const backup = path.join(directory, 'rights.dump.enc');
  fs.writeFileSync(backup, 'encrypted-backup');
  const old = new Date('2026-07-13T00:00:00.000Z');
  const now = new Date('2026-07-15T00:00:00.000Z');
  fs.utimesSync(backup, old, old);
  const manifest = createBackupManifest(backup, now);
  assert.throws(
    () => verifyBackupManifest(backup, manifest, { now }),
    /Backup artifact is older than 24 hours/,
  );
});

test('RIGHTS-ROLLOUT-003: shadow comparison returns counts without subject data', () => {
  const legacy = [{
    mode: 'hide', athleteName: 'private-name', affiliation: 'private-team',
    competition: 'private-meet', event: '100m',
  }];
  const database = legacy.map((row) => ({ ...row }));
  const report = compareShadowSuppressions(legacy, database);

  assert.deepEqual(report, {
    legacyCount: 1,
    databaseCount: 1,
    matchedCount: 1,
    missingInDatabase: 0,
    unexpectedInDatabase: 0,
    equal: true,
  });
  assert.equal(JSON.stringify(report).includes('private-name'), false);
});

test('RIGHTS-ROLLOUT-004: shadow comparison reports mismatches without details', () => {
  const report = compareShadowSuppressions(
    [{ mode: 'hide', athleteName: 'a', affiliation: 'b', competition: 'c', event: 'd' }],
    [{ mode: 'remove', athleteName: 'a', affiliation: 'b', competition: 'c', event: 'd' }],
  );
  assert.deepEqual(report, {
    legacyCount: 1,
    databaseCount: 1,
    matchedCount: 0,
    missingInDatabase: 1,
    unexpectedInDatabase: 1,
    equal: false,
  });
});

test('RIGHTS-ROLLOUT-004B: shadow comparison preserves runtime case and spacing semantics', () => {
  const legacy = [{
    mode: 'hide', athleteName: 'Athlete', affiliation: 'Team A',
    competition: 'Meet', event: '100m',
  }];
  const database = [{ ...legacy[0], affiliation: 'team  a' }];
  assert.equal(compareShadowSuppressions(legacy, database).equal, false);
});

test('RIGHTS-ROLLOUT-005: readiness requires healthy data-rights service', async () => {
  const healthyFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: 'healthy', services: { dataRights: 'ready' } }),
  });
  assert.deepEqual(await checkReadiness('https://athletime.example', healthyFetch), {
    ready: true,
    status: 200,
    dataRights: 'ready',
  });

  const degradedFetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ status: 'degraded', services: { dataRights: 'unavailable' } }),
  });
  await assert.rejects(
    () => checkReadiness('https://athletime.example', degradedFetch),
    /Deployment readiness check failed/,
  );
});

test('RIGHTS-ROLLOUT-006: remote readiness rejects plaintext HTTP', async () => {
  await assert.rejects(
    () => checkReadiness('http://athletime.example', async () => null),
    /HTTPS is required/,
  );
});

test('RIGHTS-ROLLOUT-006B: readiness rejects redirects before following them', async () => {
  const redirectFetch = async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return { status: 302, url: 'http://downgrade.example/health' };
  };
  await assert.rejects(
    () => checkReadiness('https://athletime.example', redirectFetch),
    /redirects are not allowed/,
  );
});

test('RIGHTS-ROLLOUT-007: shadow comparison rejects an ambiguous connection environment', () => {
  assert.throws(
    () => assertShadowEnvironment({ NODE_ENV: 'development' }),
    /requires NODE_ENV=production/,
  );
  assert.doesNotThrow(() => assertShadowEnvironment({ NODE_ENV: 'production' }));
  assert.doesNotThrow(() => assertShadowEnvironment({ NODE_ENV: 'test' }));
});

test('RIGHTS-ROLLOUT-008: CLI failures do not echo protected file paths', () => {
  const protectedPath = path.join(os.tmpdir(), 'private-owner-name', 'rights.dump.enc');
  const manifestPath = path.join(process.cwd(), '.data-rights-rollout', 'qa-manifest.json');
  const cli = path.join(__dirname, '..', '..', 'tools', 'check-data-rights-rollout.js');
  const result = spawnSync(process.execPath, [
    cli, 'backup-record', '--file', protectedPath, '--manifest', manifestPath,
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stderr.includes('private-owner-name'), false);
  assert.match(result.stderr, /without exposing connection or file details/);
});

test('RIGHTS-ROLLOUT-009: backup manifests cannot escape ignored local storage', () => {
  const root = path.join(os.tmpdir(), 'rights-rollout-root');
  assert.doesNotThrow(() => assertManifestPath(path.join(root, 'backup.json'), root));
  assert.throws(
    () => assertManifestPath(path.join(root, '..', 'tracked-backup.json'), root),
    /must stay under .data-rights-rollout/,
  );
});

test('RIGHTS-ROLLOUT-010: backup verification cannot weaken the 24-hour gate', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-age-limit-'));
  const backup = path.join(directory, 'rights.dump.enc');
  fs.writeFileSync(backup, 'encrypted-backup');
  const now = new Date();
  const manifest = createBackupManifest(backup, now);

  assert.throws(
    () => verifyBackupManifest(backup, manifest, { now, maxAgeHours: Number.NaN }),
    /Backup maximum age must be/,
  );
  assert.throws(
    () => verifyBackupManifest(backup, manifest, { now, maxAgeHours: 25 }),
    /Backup maximum age must be/,
  );
});

test('RIGHTS-ROLLOUT-010B: malformed CLI age fails closed', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-cli-age-'));
  const backup = path.join(directory, 'rights.dump.enc');
  fs.writeFileSync(backup, 'encrypted-backup');
  const manifestDirectory = path.join(process.cwd(), '.data-rights-rollout');
  const manifestPath = path.join(manifestDirectory, `qa-age-${process.pid}.json`);
  fs.mkdirSync(manifestDirectory, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(createBackupManifest(backup)));
  t.after(() => fs.rmSync(manifestPath, { force: true }));
  const cli = path.join(__dirname, '..', '..', 'tools', 'check-data-rights-rollout.js');
  const result = spawnSync(process.execPath, [
    cli, 'backup-verify', '--file', backup, '--manifest', manifestPath,
    '--max-age-hours', 'not-a-number',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Backup maximum age must be/);
});

test('RIGHTS-ROLLOUT-011: manifest containment rejects a symbolic-link escape', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rights-link-'));
  const root = path.join(directory, '.data-rights-rollout');
  const outside = path.join(directory, 'outside');
  const link = path.join(root, 'escape');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  try {
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error.code === 'EPERM') {
      t.skip('symbolic links are unavailable in this Windows environment');
      return;
    }
    throw error;
  }
  assert.throws(
    () => assertManifestPath(path.join(link, 'manifest.json'), root),
    /cannot contain symbolic links/,
  );
});

test('RIGHTS-ROLLOUT-012: approved roundtrip creates and looks up without returning the ticket', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') {
      return {
        status: 201,
        url: String(url),
        json: async () => ({ success: true, data: { ticketId: 'private-ticket' } }),
      };
    }
    return {
      status: 200,
      url: String(url),
      json: async () => ({ success: true, data: { status: 'received' } }),
    };
  };
  const report = await checkRequestRoundTrip('https://athletime.example', fakeFetch, 'fixed');
  assert.deepEqual(report, {
    created: true, lookup: true, createStatus: 201, lookupStatus: 200,
  });
  assert.equal(JSON.stringify(report).includes('private-ticket'), false);
  assert.equal(calls.every((call) => call.options.redirect === 'manual'), true);
});

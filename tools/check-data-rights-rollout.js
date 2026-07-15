const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const config = require('../card-studio/config');
const { migrationPoolOptions } = require('../backend/database/run-migrations');
const { buildImportPlan } = require('./migrate-data-rights-files');
const {
  checkReadiness,
  checkRequestRoundTrip,
  compareShadowSuppressions,
  createBackupManifest,
  verifyBackupManifest,
} = require('./data-rights-rollout');

function option(name, required = true) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : '';
  if (required && !value) throw new Error(`${name} is required`);
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeManifest(filePath, manifest) {
  if (fs.existsSync(filePath) && !process.argv.includes('--replace')) {
    throw new Error('Manifest already exists; use --replace only after creating a new backup');
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, filePath);
}

function assertManifestPath(filePath, root = path.join(process.cwd(), '.data-rights-rollout')) {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Manifest must stay under .data-rights-rollout');
  }
  fs.mkdirSync(resolvedRoot, { recursive: true });
  if (fs.lstatSync(resolvedRoot).isSymbolicLink()) {
    throw new Error('Manifest path cannot contain symbolic links');
  }
  let cursor = resolvedRoot;
  const parentParts = path.relative(resolvedRoot, path.dirname(resolvedFile)).split(path.sep)
    .filter(Boolean);
  for (const part of parentParts) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) fs.mkdirSync(cursor);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error('Manifest path cannot contain symbolic links');
    }
  }
  const realRoot = fs.realpathSync(resolvedRoot);
  const realParent = fs.realpathSync(path.dirname(resolvedFile));
  const realRelative = path.relative(realRoot, realParent);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error('Manifest path cannot contain symbolic links');
  }
  if (fs.existsSync(resolvedFile) && fs.lstatSync(resolvedFile).isSymbolicLink()) {
    throw new Error('Manifest path cannot contain symbolic links');
  }
}

function legacyFiles() {
  const directory = path.join(config.dirs.data, 'requests');
  return {
    requests: path.join(directory, 'requests.json'),
    suppressions: path.join(directory, 'suppressions.json'),
  };
}

function readArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const value = readJson(filePath);
  if (!Array.isArray(value)) throw new Error('Legacy rollout input must be an array');
  return value;
}

async function shadowCheck() {
  assertShadowEnvironment(process.env);
  const files = legacyFiles();
  const plan = buildImportPlan(readArray(files.requests), readArray(files.suppressions));
  const legacyRows = plan.rows.filter((row) => row.suppression).map((row) => ({
    ...row.suppression,
    athleteName: row.request.athleteName,
    affiliation: row.request.affiliation,
    competition: row.request.competition,
    event: row.request.event,
  }));
  const pool = new Pool(migrationPoolOptions());
  try {
    const result = await pool.query(`
      SELECT mode, legacy_athlete_name AS "athleteName",
             legacy_affiliation AS affiliation, legacy_competition AS competition,
             legacy_event AS event
      FROM record_suppressions
      WHERE active = TRUE AND scope_kind = 'legacy_tuple'
    `);
    const report = compareShadowSuppressions(legacyRows, result.rows);
    process.stdout.write(`${JSON.stringify({ phase: 'shadow', ...report })}\n`);
    if (!report.equal) process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

function assertShadowEnvironment(environment) {
  if (!['production', 'test'].includes(environment.NODE_ENV)) {
    throw new Error('Shadow comparison requires NODE_ENV=production or an isolated test database');
  }
}

function safeErrorMessage(error) {
  const message = String(error?.message || '');
  const safePrefixes = [
    '--file is required',
    '--manifest is required',
    '--base-url is required',
    'Backup artifact must be a non-empty file',
    'Unsupported backup manifest version',
    'Backup artifact filename mismatch',
    'Backup artifact size mismatch',
    'Backup artifact checksum mismatch',
    'Backup maximum age must be',
    'Invalid backup manifest timestamp',
    'Backup manifest timestamp is in the future',
    'Backup artifact timestamp is in the future',
    'Backup manifest is older than',
    'Backup artifact is older than',
    'Manifest already exists',
    'Manifest must stay under .data-rights-rollout',
    'Manifest path cannot contain symbolic links',
    'Shadow comparison requires',
    'HTTPS is required',
    'HTTP redirects are not allowed',
    'Deployment readiness check failed with HTTP',
    'Request smoke creation failed with HTTP',
    'Request smoke lookup failed with HTTP',
    'Roundtrip smoke requires --confirm-write-smoke',
    'Invalid legacy data-rights',
    'Invalid legacy data-rights suppression',
    'Incomplete legacy suppression scope',
    'Duplicate legacy',
    'Unmatched legacy suppression',
    'Command must be',
  ];
  return safePrefixes.some((prefix) => message.startsWith(prefix))
    ? message
    : 'Rollout check failed without exposing connection or file details';
}

async function main() {
  const command = process.argv[2];
  if (command === 'backup-record') {
    const file = path.resolve(option('--file'));
    const manifestPath = path.resolve(option('--manifest'));
    assertManifestPath(manifestPath);
    const manifest = createBackupManifest(file);
    writeManifest(manifestPath, manifest);
    process.stdout.write(`${JSON.stringify({ phase: 'backup-record', ...manifest })}\n`);
    return;
  }
  if (command === 'backup-verify') {
    const file = path.resolve(option('--file'));
    const manifestPath = path.resolve(option('--manifest'));
    assertManifestPath(manifestPath);
    const maxAgeHours = Number(option('--max-age-hours', false) || 24);
    const result = verifyBackupManifest(file, readJson(manifestPath), { maxAgeHours });
    process.stdout.write(`${JSON.stringify({ phase: 'backup-verify', ...result })}\n`);
    return;
  }
  if (command === 'shadow') {
    await shadowCheck();
    return;
  }
  if (command === 'readiness') {
    const result = await checkReadiness(option('--base-url'));
    process.stdout.write(`${JSON.stringify({ phase: 'readiness', ...result })}\n`);
    return;
  }
  if (command === 'roundtrip') {
    if (!process.argv.includes('--confirm-write-smoke')) {
      throw new Error('Roundtrip smoke requires --confirm-write-smoke');
    }
    const result = await checkRequestRoundTrip(option('--base-url'));
    process.stdout.write(`${JSON.stringify({ phase: 'roundtrip', ...result })}\n`);
    return;
  }
  throw new Error('Command must be backup-record, backup-verify, shadow, readiness, or roundtrip');
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Data-rights rollout check failed: ${safeErrorMessage(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertManifestPath,
  assertShadowEnvironment,
  main,
  safeErrorMessage,
  shadowCheck,
  writeManifest,
};

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, '..', '..');
const SAMPLE_ARCHIVE = path.join(
  ROOT,
  'data',
  'fixtures',
  'kaaf-backfill-originals',
  'sample-backfill.tar.gz',
);

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('BACKFILL-IMPORT-001 Given a KAAF backfill tar When importing Then originals are private and manifest is commit-safe', async () => {
  const root = tempDir('athletetime-backfill-import-');
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/import-kaaf-backfill-originals.js',
      '--archive',
      SAMPLE_ARCHIVE,
      '--batch',
      'test-backfill',
      '--storage-root',
      path.join(root, 'private-originals'),
      '--manifest',
      path.join(root, 'manifest.json'),
      '--report',
      path.join(root, 'report.md'),
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });
    const result = JSON.parse(stdout);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.equal(result.fileCount, 3);
    assert.equal(result.storageTrackedByGit, false);
    assert.equal(fs.existsSync(path.join(root, 'report.md')), true);
    assert.equal(manifest.files.length, 3);
    assert.deepEqual([...new Set(manifest.files.map((file) => file.year))].sort(), [2005, 2006]);
    assert.equal(manifest.files.every((file) => !('filePath' in file)), true);
    assert.equal(manifest.files.every((file) => file.privateStoragePath.startsWith('data/sources/import/originals/')), true);
    assert.equal(JSON.stringify(manifest).includes('PERSON_NO'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('BACKFILL-IMPORT-002 Given a missing archive When importing Then a typed operator error is returned', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [
      'tools/import-kaaf-backfill-originals.js',
      '--archive',
      path.join(os.tmpdir(), 'missing-kaaf-backfill.tar.gz'),
      '--batch',
      'missing',
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /BACKFILL_ARCHIVE_NOT_FOUND/);
      return true;
    },
  );
});

test('BACKFILL-IMPORT-003 Given direct tar extraction is unsafe When safe-entry mode is used Then original archive names are preserved separately', async () => {
  const root = tempDir('athletetime-backfill-safe-entry-');
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/import-kaaf-backfill-originals.js',
      '--archive',
      SAMPLE_ARCHIVE,
      '--batch',
      'test-safe-entry',
      '--storage-root',
      path.join(root, 'private-originals'),
      '--manifest',
      path.join(root, 'manifest.json'),
      '--report',
      path.join(root, 'report.md'),
      '--extract-mode',
      'safe-entry',
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });
    const result = JSON.parse(stdout);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.equal(result.extractionMode, 'safe-entry');
    assert.equal(manifest.files.length, 3);
    assert.equal(manifest.files.every((file) => file.archivePathInBackup.includes('kaaf-backfill-sample/')), true);
    assert.equal(manifest.files.every((file) => !file.privateStoragePath.includes('sample-backfill/')), true);
    assert.equal(manifest.files.every((file) => file.privateStoragePath.startsWith('data/sources/import/originals/')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

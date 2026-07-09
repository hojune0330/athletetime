const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..', '..');

const {
  buildLegacyXlsDryRunReport,
  renderLegacyXlsDryRunMarkdown,
  readLegacyXlsTextWorkbook,
  sanitizeXlsWorkbookSummary,
} = require('../../card-studio/services/legacyXlsConverterDryRunService');

function createSyntheticXlsFixture(directory, options = {}) {
  const filename = options.filename || 'synthetic-legacy.xls';
  const sheetName = options.sheetName || '남자100m';
  const filePath = path.join(directory, filename);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['순위', '성명', '소속', '기록'],
    [1, '김테스트', '테스트고', '10.99'],
    [2, '이테스트', '테스트중', '11.01'],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath, { bookType: 'xls' });
  return filePath;
}

function createManifest({ directory, xlsPath, originalFilename = 'synthetic-legacy.xls' }) {
  const manifestPath = path.join(directory, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    batch: 'synthetic-a3-xls',
    files: [
      {
        year: 2017,
        originalFilename,
        extension: '.xls',
        sha256: '1234567890abcdef',
        privateStoragePath: xlsPath,
        archivePathInBackup: '2017/synthetic-legacy.xls',
      },
    ],
  }, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function assertNoPrivateTerms(text) {
  assert.equal(
    /privateStoragePath|sourcePath|data\/sources\/import\/originals|PERSON_NO|010-0000-0000|secret|birthdate|phone|email|address/iu.test(text),
    false,
  );
}

test('LEGACY-XLS-DRYRUN-001 Given a synthetic BIFF .xls workbook When reading Then sheet names and rows are available', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-fixture-'));
  try {
    const xlsPath = createSyntheticXlsFixture(directory);

    const workbook = readLegacyXlsTextWorkbook(xlsPath);

    assert.deepEqual(workbook.sheetNames, ['남자100m']);
    assert.deepEqual(workbook.sheets[0].rows[1], ['1', '김테스트', '테스트고', '10.99']);
    assert.equal(JSON.stringify(workbook).includes('PERSON_NO'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-DRYRUN-002 Given a manifest with xls files When building report Then output is sanitized and non-mutating', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-report-'));
  try {
    const xlsPath = createSyntheticXlsFixture(directory);
    const manifestPath = createManifest({ directory, xlsPath });

    const report = buildLegacyXlsDryRunReport({
      manifestPath,
      years: [2017],
      limit: 1,
    });
    const text = JSON.stringify(report);

    assert.equal(report.status, 'dry_run_complete');
    assert.equal(report.attemptedFiles, 1);
    assert.equal(report.convertedFiles, 1);
    assert.equal(report.failedFiles, 0);
    assert.equal(report.serviceDataMutated, false);
    assert.equal(report.workbooks[0].status, 'converted_for_dry_run');
    assert.equal(report.workbooks[0].sheetNames[0], '남자100m');
    assertNoPrivateTerms(text);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-DRYRUN-003 Given unsafe summary input When sanitizing Then private fields and raw rows are dropped', () => {
  const summary = sanitizeXlsWorkbookSummary({
    year: 2017,
    originalFilename: 'sample.xls',
    extension: '.xls',
    sha256: '1234567890abcdef',
    sourcePath: 'data/sources/import/originals/private.xls',
    privateStoragePath: 'secret/private.xls',
    sheetNames: ['Sheet1'],
    rows: [['PERSON_NO', '010-0000-0000']],
    rowCount: 1,
    status: 'converted_for_dry_run',
  });

  const text = JSON.stringify(summary);
  assert.equal(summary.sha256Prefix, '1234567890ab');
  assertNoPrivateTerms(text);
});

test('LEGACY-XLS-DRYRUN-004 Given private tokens in workbook metadata When reporting Then JSON and markdown redact them', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-private-token-'));
  try {
    const xlsPath = createSyntheticXlsFixture(directory, {
      filename: 'PERSON_NO-secret.xls',
      sheetName: 'PERSON_NO',
    });
    const manifestPath = createManifest({
      directory,
      xlsPath,
      originalFilename: 'PERSON_NO-secret.xls',
    });

    const report = buildLegacyXlsDryRunReport({
      manifestPath,
      years: [2017],
      limit: 1,
    });
    const markdown = renderLegacyXlsDryRunMarkdown(report);

    assert.equal(report.workbooks[0].originalFilename, '[redacted]');
    assert.deepEqual(report.workbooks[0].sheetNames, ['[redacted]']);
    assertNoPrivateTerms(JSON.stringify(report));
    assertNoPrivateTerms(markdown);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-DRYRUN-005 Given private tokens in missing workbook metadata When reporting errors Then JSON and markdown redact them', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-private-error-'));
  try {
    const manifestPath = createManifest({
      directory,
      xlsPath: path.join(directory, 'missing.xls'),
      originalFilename: 'PERSON_NO-secret.xls',
    });

    const report = buildLegacyXlsDryRunReport({
      manifestPath,
      years: [2017],
      limit: 1,
    });
    const markdown = renderLegacyXlsDryRunMarkdown(report);

    assert.equal(report.errors[0].originalFilename, '[redacted]');
    assertNoPrivateTerms(JSON.stringify(report));
    assertNoPrivateTerms(markdown);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-DRYRUN-006 Given operator CLI When running dry-run Then evidence is written and data results are untouched', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-cli-'));
  try {
    const xlsPath = createSyntheticXlsFixture(directory);
    const manifestPath = createManifest({ directory, xlsPath });
    const outDir = path.join(directory, 'out');
    const before = spawnSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(before.status, 0);

    const result = spawnSync(process.execPath, [
      'tools/convert-legacy-xls-dry-run.js',
      '--manifest',
      manifestPath,
      '--years',
      '2017',
      '--limit',
      '1',
      '--out-dir',
      path.join(directory, 'ignored-out'),
      '--out-dir',
      outDir,
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    const reportText = fs.readFileSync(path.join(outDir, 'xls-dry-run-report.json'), 'utf8');
    assert.equal(payload.ok, true);
    assert.equal(payload.outDir.endsWith('/out'), true);
    assert.equal(payload.report.convertedFiles, 1);
    assertNoPrivateTerms(reportText);

    const after = spawnSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(after.status, 0);
    assert.equal(after.stdout, before.stdout);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-DRYRUN-007 Given missing manifest When running CLI Then structured error is returned', () => {
  const result = spawnSync(process.execPath, [
    'tools/convert-legacy-xls-dry-run.js',
    '--manifest',
    path.join(os.tmpdir(), 'athletetime-missing-manifest.json'),
    '--years',
    '2017',
    '--json',
  ], { cwd: ROOT, encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'LEGACY_XLS_DRY_RUN_FAILED');
});

test('LEGACY-XLS-DRYRUN-008 Given malformed CLI arguments When running CLI Then structured validation errors are returned', () => {
  const cases = [
    ['--years', '--json'],
    ['--years', 'not-a-year', '--json'],
    ['--years', '2017,not-a-year', '--json'],
    ['--limit', '-1', '--json'],
    ['--manifest', '--json'],
    ['--out-dir', '--json'],
  ];

  for (const args of cases) {
    const result = spawnSync(process.execPath, [
      'tools/convert-legacy-xls-dry-run.js',
      ...args,
    ], { cwd: ROOT, encoding: 'utf8' });
    assert.notEqual(result.status, 0, args.join(' '));
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'LEGACY_XLS_DRY_RUN_FAILED');
    assert.match(payload.message, /Invalid|Missing/u);
  }
});

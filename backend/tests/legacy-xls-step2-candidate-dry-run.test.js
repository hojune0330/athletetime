const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..', '..');

const {
  buildLegacyXlsStep2CandidateDryRun,
  renderLegacyXlsStep2CandidateMarkdown,
} = require('../../card-studio/services/legacyXlsStep2CandidateDryRunService');

const ORIGINAL_FIXTURE_ROOT = process.env.ATHLETETIME_LEGACY_ORIGINAL_FIXTURE_ROOT
  ? path.resolve(process.env.ATHLETETIME_LEGACY_ORIGINAL_FIXTURE_ROOT)
  : path.join(
    ROOT,
    'data',
    'sources',
    'import',
    'originals',
    '20260708-kaaf-backfill-2005-2017',
  );
const TRACK_A_XLS_SAMPLE = path.join(ORIGINAL_FIXTURE_ROOT, '2015', '0287_001_20150226_0_b09ed150f7.xls');
const ORIGINAL_FIXTURE_SKIP_REASON = fs.existsSync(TRACK_A_XLS_SAMPLE)
  ? false
  : 'private original workbook not present';

function writeSyntheticMixedXls(directory) {
  const filePath = path.join(directory, 'synthetic-mixed.xls');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['2026 테스트 육상대회'],
    ['남자고등학교부'],
    ['종목', '1 위', '', '', '2 위', '', ''],
    ['', '이름', '소속', '기록', '이름', '소속', '기록'],
    ['100m', '김가로', '서울고', '10.99', '이가로', '부산고', '11.02'],
    ['여자고등학교부'],
    ['종목', '1 위', '', '', '2 위', '', ''],
    ['', '이름', '소속', '기록', '이름', '소속', '기록'],
    ['100m', '박가로', '서울여고', '12.21', '최가로', '부산여고', '12.30'],
  ]), '종합기록');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['순위', '성명', '소속', '기록'],
    [1, '세로선수', '세로팀', '2:20:00'],
  ]), '남자마라톤');
  XLSX.writeFile(workbook, filePath, { bookType: 'xls' });
  return filePath;
}

function writeManifest(directory, xlsPath) {
  const manifestPath = path.join(directory, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    batch: 'synthetic-a3-step2',
    files: [{
      year: 2017,
      originalFilename: 'synthetic-mixed.xls',
      extension: '.xls',
      sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      privateStoragePath: xlsPath,
      archivePathInBackup: '2017/synthetic-mixed.xls',
    }],
  }, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function assertSafeEvidenceText(text) {
  assert.equal(
    /privateStoragePath|sourcePath|data[\\/]sources[\\/]import[\\/]originals|PERSON_NO|birthdate|phone|email|address|secret|010-\d{3,4}-\d{4}/iu.test(text),
    false,
  );
}

test('LEGACY-XLS-STEP2-001 mixed workbooks parse only horizontal sheets and keep blocked sheets as evidence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-step2-mixed-'));
  try {
    const xlsPath = writeSyntheticMixedXls(directory);
    const manifestPath = writeManifest(directory, xlsPath);

    const report = buildLegacyXlsStep2CandidateDryRun({
      manifestPath,
      years: [2017],
      divisionReviewThreshold: 1,
    });

    assert.equal(report.serviceDataMutated, false);
    assert.equal(report.fableApprovedPromotableWorkbooks, 0);
    assert.equal(report.blockedWorkbooks, 1);
    assert.equal(report.partialPromotedWorkbooks, 1);
    assert.equal(report.candidateRows, 4);
    assert.deepEqual(report.candidates.map((row) => row.name), ['김가로', '이가로', '박가로', '최가로']);
    assert.equal(report.candidates.some((row) => row.name === '세로선수'), false);
    assert.deepEqual(report.blockedWorkbookEvidence[0].blockedSheets.map((sheet) => sheet.name), ['남자마라톤']);
    assert.equal(report.candidates[0].divisionMeta.divisionKey, 'men-high');
    assert.equal(report.candidates[2].divisionMeta.divisionKey, 'women-high');
    assertSafeEvidenceText(JSON.stringify(report));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-STEP2-002 real 2015-2017 originals follow Fable candidate and block boundaries', { skip: ORIGINAL_FIXTURE_SKIP_REASON }, () => {
  const report = buildLegacyXlsStep2CandidateDryRun({
    years: [2015, 2016, 2017],
  });

  assert.equal(report.attemptedFiles, 83);
  assert.equal(report.fableApprovedPromotableWorkbooks, 45);
  assert.equal(report.blockedWorkbooks, 38);
  assert.equal(report.partialPromotedWorkbooks, 3);
  assert.equal(report.blockedWorkbookEvidence.length, 38);
  assert.ok(report.candidateRows > 0);
  assert.equal(report.candidates.some((row) => row.source?.sheetLayout !== 'horizontal_podium'), false);
  assert.equal(report.divisionStats.unspecifiedRatio <= 0.2, true);
  assert.equal(report.manualTopRecordDedup.skippedDuplicates, 7321);
  assertSafeEvidenceText(JSON.stringify(report));
});

test('LEGACY-XLS-STEP2-003 CLI writes sanitized candidate and blocked evidence without touching service data', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-step2-cli-'));
  try {
    const xlsPath = writeSyntheticMixedXls(directory);
    const manifestPath = writeManifest(directory, xlsPath);
    const outDir = path.join(directory, 'out');
    const before = spawnSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(before.status, 0);

    const result = spawnSync(process.execPath, [
      'tools/normalize-legacy-xls-candidates-dry-run.js',
      '--manifest',
      manifestPath,
      '--years',
      '2017',
      '--out-dir',
      outDir,
      '--division-review-threshold',
      '1',
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.report.candidateRows, 4);
    const candidatesText = fs.readFileSync(path.join(outDir, 'normalized-candidates.jsonl'), 'utf8');
    const blockedText = fs.readFileSync(path.join(outDir, 'blocked-workbooks.json'), 'utf8');
    const markdown = fs.readFileSync(path.join(outDir, 'step2-review-report.md'), 'utf8');
    assert.match(candidatesText, /김가로/u);
    assert.doesNotMatch(candidatesText, /세로선수/u);
    assertSafeEvidenceText(candidatesText);
    assertSafeEvidenceText(blockedText);
    assertSafeEvidenceText(markdown);

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

test('LEGACY-XLS-STEP2-004 renderer records Fable boundaries and partial promotion rule', () => {
  const report = {
    years: [2015, 2016, 2017],
    attemptedFiles: 83,
    fableApprovedPromotableWorkbooks: 45,
    blockedWorkbooks: 38,
    partialPromotedWorkbooks: 3,
    candidateRows: 10,
    serviceDataMutated: false,
    manualTopRecordDedup: { skippedDuplicates: 7321 },
    divisionStats: { unspecifiedRatio: 0.01 },
    blockReasonCounts: { VERTICAL_RESULT_LIST_NEEDS_PARSER: 35 },
    candidateWorkbooksByStatus: { fully_promotable: 45, partially_promoted: 3 },
  };

  const markdown = renderLegacyXlsStep2CandidateMarkdown(report);

  assert.match(markdown, /45 promotable workbooks/u);
  assert.match(markdown, /38 blocked workbooks/u);
  assert.match(markdown, /partially promoted/u);
  assert.match(markdown, /7,321/u);
  assertSafeEvidenceText(markdown);
});

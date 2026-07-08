const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const {
  DEFAULT_BACKFILL_MANIFEST_PATH,
  buildLegacyNormalizationPlan,
  extractHorizontalPodiumResults,
  inspectLegacyXlsxWorkbook,
} = require('../../card-studio/services/legacyResultNormalizationService');

const TRACK_A_SAMPLE = path.join(
  ROOT,
  'data',
  'sources',
  'import',
  'originals',
  '20260708-kaaf-backfill-2005-2017',
  '2017',
  '0362_001_31_120170516_e7a5e2678f.xlsx',
);

test('LEGACY-NORMALIZE-001 Given 2015-2017 backfill files When planning Track A Then safe and blocked spreadsheets are separated', () => {
  const plan = buildLegacyNormalizationPlan({ years: [2015, 2016, 2017] });

  assert.equal(plan.batch, '20260708-kaaf-backfill-2005-2017');
  assert.equal(plan.totals.spreadsheetFiles, 103);
  assert.equal(plan.totals.xlsxFiles, 20);
  assert.equal(plan.totals.xlsFiles, 83);
  assert.equal(plan.totals.rawOriginalsTrackedByGit, 0);
  assert.equal(plan.files.every((file) => !('filePath' in file)), true);
  assert.equal(plan.files.every((file) => file.sourcePath.startsWith('data/sources/import/originals/')), true);
});

test('LEGACY-NORMALIZE-002 Given a horizontal podium workbook When inspecting Then the workbook layout is detected without Python', () => {
  assert.equal(fs.existsSync(TRACK_A_SAMPLE), true);

  const workbook = inspectLegacyXlsxWorkbook(TRACK_A_SAMPLE);

  assert.deepEqual(workbook.sheetNames, ['남자', '여자']);
  assert.equal(workbook.sheets[0].layout, 'horizontal_podium');
  assert.equal(workbook.sheets[0].headerRowNumber, 6);
  assert.equal(workbook.sheets[0].resultRowCount, 20);
});

test('LEGACY-NORMALIZE-003 Given a horizontal podium workbook When extracting Then athlete result candidates keep event, rank, name, team, record, and source', () => {
  const workbook = inspectLegacyXlsxWorkbook(TRACK_A_SAMPLE);
  const results = extractHorizontalPodiumResults({
    competitionName: '제31회 전국체육고등학교체육대회(육상경기)',
    sourcePath: 'data/sources/import/originals/20260708-kaaf-backfill-2005-2017/2017/0362_001_31_120170516_e7a5e2678f.xlsx',
    workbook,
    year: 2017,
  });

  const first = results.find((result) => result.event === '남자 100m' && result.rank === 1);

  assert.equal(first.name, '최선재');
  assert.equal(first.affiliation, '경남체육고');
  assert.equal(first.record, '10.99');
  assert.equal(first.source.originalFilename, '0362_001_31_120170516_e7a5e2678f.xlsx');
  assert.equal(JSON.stringify(results).includes('PERSON_NO'), false);
});

test('LEGACY-NORMALIZE-004 Given the original vault When checking git Then no raw original file is committed', () => {
  assert.equal(fs.existsSync(DEFAULT_BACKFILL_MANIFEST_PATH), true);

  const stdout = execFileSync('git', ['ls-files', 'data/sources/import/originals'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(stdout.trim(), '');
});

test('LEGACY-NORMALIZE-005 Given Track A years When generating evidence Then candidates and review report are written without raw originals', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-legacy-evidence-'));
  try {
    const stdout = execFileSync(process.execPath, [
      'tools/normalize-legacy-results.js',
      '--years',
      '2015,2016,2017',
      '--out-dir',
      outDir,
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });
    const result = JSON.parse(stdout);
    const candidates = fs.readFileSync(path.join(outDir, 'normalized-candidates.jsonl'), 'utf8');

    assert.equal(result.ok, true);
    assert.equal(result.plan.totals.spreadsheetFiles, 103);
    assert.equal(result.inspection.errors, 0);
    assert.equal(result.inspection.horizontalPodiumWorkbooks > 0, true);
    assert.equal(result.inspection.candidateRecords > 200, true);
    assert.equal(fs.existsSync(path.join(outDir, 'review-report.md')), true);
    assert.equal(candidates.includes('"name":"김국영"'), true);
    assert.equal(candidates.includes('"name":"최선재"'), true);
    assert.equal(candidates.includes('성명 소속 기록'), false);
    assert.equal(/[0-9]E-\d/i.test(candidates), false);
    assert.equal(/000000000000\d/.test(candidates), false);
    assert.equal(candidates.includes('PERSON_NO'), false);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

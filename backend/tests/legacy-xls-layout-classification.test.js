const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..', '..');

const {
  DEFAULT_BACKFILL_MANIFEST_PATH,
} = require('../../card-studio/services/legacyResultNormalizationService');
const {
  buildLegacyXlsDryRunReport,
  renderLegacyXlsDryRunMarkdown,
} = require('../../card-studio/services/legacyXlsConverterDryRunService');
const {
  classifyLegacyXlsSheet,
} = require('../../card-studio/services/legacyXlsLayoutClassifierService');

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

function assertNoPrivateTerms(text) {
  assert.equal(
    /privateStoragePath|sourcePath|data\/sources\/import\/originals|PERSON_NO|010-0000-0000|secret|birthdate|phone|email|address/iu.test(text),
    false,
  );
}

function writeWorkbook(directory, filename, sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }
  const filePath = path.join(directory, filename);
  XLSX.writeFile(workbook, filePath, { bookType: 'xls' });
  return filePath;
}

function writeManifest(directory, files) {
  const manifestPath = path.join(directory, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    batch: 'synthetic-layout',
    files: files.map((file, index) => ({
      year: file.year || 2017,
      originalFilename: file.originalFilename,
      extension: '.xls',
      sha256: `${String(index + 1).repeat(16)}abcdef`,
      privateStoragePath: file.filePath,
      archivePathInBackup: `${file.year || 2017}/${file.originalFilename}`,
    })),
  }, null, 2)}\n`, 'utf8');
  return manifestPath;
}

test('LEGACY-XLS-LAYOUT-001 Given representative sheet shapes When classifying Then core layout families are detected', () => {
  const horizontal = classifyLegacyXlsSheet({
    name: '종합기록',
    rows: [
      ['종목', '1 위', '', '', '2 위', '', ''],
      ['', '이름', '소속', '기록', '이름', '소속', '기록'],
      ['100m', '김테스트', '테스트고', '10.99', '이테스트', '테스트중', '11.01'],
    ],
  });
  const vertical = classifyLegacyXlsSheet({
    name: '남일마라톤',
    rows: [
      ['제97회 전국체육대회 남자일반부 마라톤 결과'],
      ['순위', '번호', '성명', '소속', '기록', '비고'],
      ['1', '00733', '김테스트', '테스트시청', '2:18:38'],
    ],
  });
  const summary = classifyLegacyXlsSheet({
    name: '신기록현황',
    rows: [
      ['기록구분', '종별', '종목', '성명', '소속', '기록', '종전기록'],
      ['대회신', '남자부', '100m', '김테스트', '테스트고', '10.99', '11.00'],
    ],
  });

  assert.equal(horizontal.layout, 'horizontal_podium');
  assert.equal(horizontal.parserReuse, 'extractHorizontalPodiumResults');
  assert.equal(horizontal.resultRowEstimate, 1);
  assert.equal(vertical.layout, 'vertical_result_list');
  assert.equal(vertical.eventColumnHint, 'sheet_or_title');
  assert.equal(vertical.resultRowEstimate, 1);
  assert.equal(summary.layout, 'summary_only');
  assert.equal(summary.resultRowEstimate, 0);
});

test('LEGACY-XLS-LAYOUT-002 Given synthetic workbooks When dry-running Then workbook and sheet layouts are summarized safely', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-layout-'));
  try {
    const horizontalPath = writeWorkbook(directory, 'horizontal.xls', {
      '종합기록': [
        ['종목', '1 위', '', '', '2 위', '', ''],
        ['', '이름', '소속', '기록', '이름', '소속', '기록'],
        ['100m', '김테스트', '테스트고', '10.99', '이테스트', '테스트중', '11.01'],
      ],
      '신기록현황': [
        ['기록구분', '종별', '종목', '성명', '소속', '기록', '종전기록'],
      ],
    });
    const verticalPath = writeWorkbook(directory, 'vertical.xls', {
      '남일마라톤': [
        ['순위', '번호', '성명', '소속', '기록', '비고'],
        ['1', '00733', '김테스트', '테스트시청', '2:18:38'],
      ],
    });
    const manifestPath = writeManifest(directory, [
      { originalFilename: 'horizontal.xls', filePath: horizontalPath },
      { originalFilename: 'vertical.xls', filePath: verticalPath },
    ]);

    const report = buildLegacyXlsDryRunReport({ manifestPath, years: [2017] });
    const markdown = renderLegacyXlsDryRunMarkdown(report);

    assert.equal(report.attemptedFiles, 2);
    assert.equal(report.layoutSummary.workbookLayouts.mixed, 1);
    assert.equal(report.layoutSummary.workbookLayouts.vertical_result_list, 1);
    assert.equal(report.promotableWorkbooks, 1);
    assert.equal(report.blockReasonCounts.VERTICAL_RESULT_LIST_NEEDS_PARSER, 1);
    assert.equal(report.workbooks[0].sheets[0].layout, 'horizontal_podium');
    assert.equal(report.workbooks[0].sheets[1].layout, 'summary_only');
    assert.equal(report.workbooks[0].promotable, true);
    assert.equal(report.workbooks[1].promotable, false);
    assertNoPrivateTerms(JSON.stringify(report));
    assertNoPrivateTerms(markdown);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('LEGACY-XLS-LAYOUT-003 Given 2015-2017 xls originals When dry-running all Then 83 workbooks are classified and counted', { skip: ORIGINAL_FIXTURE_SKIP_REASON }, () => {
  const report = buildLegacyXlsDryRunReport({
    manifestPath: DEFAULT_BACKFILL_MANIFEST_PATH,
    years: [2015, 2016, 2017],
  });

  const workbookLayoutTotal = Object.values(report.layoutSummary.workbookLayouts)
    .reduce((sum, count) => sum + count, 0);

  assert.equal(report.attemptedFiles, 83);
  assert.equal(report.convertedFiles, 83);
  assert.equal(report.failedFiles, 0);
  assert.equal(workbookLayoutTotal, 83);
  assert.equal(report.workbooks.every((workbook) => Array.isArray(workbook.sheets)), true);
  assert.equal(report.layoutSummary.byYear['2015'].total > 0, true);
  assert.equal('unknown' in report.layoutSummary.workbookLayouts, true);
  assertNoPrivateTerms(JSON.stringify(report));
});

test('LEGACY-XLS-LAYOUT-004 Given operator CLI When writing layout evidence Then reports include counts and do not mutate service data', { skip: ORIGINAL_FIXTURE_SKIP_REASON }, () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-xls-layout-cli-'));
  try {
    const before = execFileSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const stdout = execFileSync(process.execPath, [
      'tools/convert-legacy-xls-dry-run.js',
      '--years',
      '2015,2016,2017',
      '--out-dir',
      outDir,
      '--json',
    ], { cwd: ROOT, encoding: 'utf8' });
    const payload = JSON.parse(stdout);
    const jsonReport = fs.readFileSync(path.join(outDir, 'xls-dry-run-report.json'), 'utf8');
    const markdownReport = fs.readFileSync(path.join(outDir, 'xls-dry-run-report.md'), 'utf8');
    const after = execFileSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.report.attemptedFiles, 83);
    assert.match(markdownReport, /Layout summary/u);
    assert.match(markdownReport, /Promotable workbooks/u);
    assertNoPrivateTerms(jsonReport);
    assertNoPrivateTerms(markdownReport);
    assert.equal(after, before);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const FORBIDDEN_SOURCE_PATH_PATTERN = new RegExp([
  ['private', 'StoragePath'].join(''),
  ['source', 'Path'].join(''),
  ['data', 'sources', 'import', 'originals'].join('/'),
].join('|'), 'i');

const {
  buildLegacyExpansionPreflightReport,
  renderLegacyExpansionPreflightMarkdown,
} = require('../../card-studio/services/legacyExpansionPreflightService');

function assertNoPrivateSourcePath(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  assert.equal(FORBIDDEN_SOURCE_PATH_PATTERN.test(text), false);
}

test('LEGACY-PREFLIGHT-001 Given Track A candidates When auditing A-2 Then held 2016 indoor workbook remains blocked with parser rules', () => {
  const report = buildLegacyExpansionPreflightReport({ years: [2015, 2016, 2017] });

  assert.equal(report.a2HeldIndoor.status, 'blocked_pending_parser');
  assert.equal(report.a2HeldIndoor.heldWorkbooks.length, 1);
  assert.deepEqual(report.a2HeldIndoor.requiredParserRules.map((rule) => rule.id), [
    'strip-indoor-heat-suffix',
    'drop-header-pollution',
    'preserve-indoor-event-keys',
    'still-held-on-ambiguity',
  ]);

  const held = report.a2HeldIndoor.heldWorkbooks[0];
  assert.equal(held.year, 2016);
  assert.match(held.competitionName, /전국대구실내육상경기대회/u);
  assert.equal(held.candidateRows, 729);
  assert.equal(held.reason, 'UNSAFE_EVENT_LABELS');
  assert.equal(held.headerRows, 131);
  assert.equal(held.indoor, true);
  assert.equal(held.sheetLayouts.some((sheet) => sheet.name === '60m'), true);
  assert.equal(held.sheetLayouts.some((sheet) => sheet.name === '60mH'), true);
  assertNoPrivateSourcePath(report);
});

test('LEGACY-PREFLIGHT-002 Given 2015-2017 legacy manifest When auditing A-3 Then 83 xls files are approved for dry-run but not service promotion', () => {
  const report = buildLegacyExpansionPreflightReport({ years: [2015, 2016, 2017] });

  assert.equal(report.a3XlsQueue.status, 'ready_for_dry_run');
  assert.equal(report.a3XlsQueue.xlsFiles, 83);
  assert.deepEqual(report.a3XlsQueue.byYear, { 2015: 29, 2016: 28, 2017: 26 });
  assert.equal(report.a3XlsQueue.dryRunDependencyApproved, true);
  assert.equal(report.a3XlsQueue.requiresDependencyApproval, false);
  assert.equal(report.a3XlsQueue.servicePromotionAllowed, false);
  assert.equal(report.a3XlsQueue.conversionAttempted, false);
  assert.equal(report.safety.rawOriginalsTrackedByGit, 0);
  assert.equal(report.safety.serviceDataMutated, false);
  assert.equal(report.a3XlsQueue.workbooks.length, 83);
  assert.equal(report.a3XlsQueue.workbooks[0].sha256Prefix.length, 12);
  assertNoPrivateSourcePath(report);
});

test('LEGACY-PREFLIGHT-003 Given operator CLI When writing preflight evidence Then output is sanitized and service data is untouched', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-legacy-preflight-'));
  try {
    const before = spawnSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(before.status, 0);

    const result = spawnSync(
      process.execPath,
      [
        'tools/audit-legacy-expansion-queue.js',
        '--years',
        '2015,2016,2017',
        '--out-dir',
        outDir,
        '--json',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    const jsonPath = path.join(outDir, 'preflight-report.json');
    const markdownPath = path.join(outDir, 'preflight-report.md');
    assert.equal(payload.ok, true);
    assert.equal(fs.existsSync(jsonPath), true);
    assert.equal(fs.existsSync(markdownPath), true);

    const reportText = [
      result.stdout,
      fs.readFileSync(jsonPath, 'utf8'),
      fs.readFileSync(markdownPath, 'utf8'),
    ].join('\n');
    assert.match(reportText, /A-2\/A-3 Legacy Expansion Preflight/u);
    assertNoPrivateSourcePath(reportText);

    const after = spawnSync('git', ['status', '--short', '--', 'data/results'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(after.status, 0);
    assert.equal(after.stdout, before.stdout);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('LEGACY-PREFLIGHT-004 Given rendered operator report Then Fable can see exact next actions without raw originals', () => {
  const report = buildLegacyExpansionPreflightReport({ years: [2015, 2016, 2017] });
  const markdown = renderLegacyExpansionPreflightMarkdown(report);

  assert.match(markdown, /2016 전국대구실내육상경기대회/u);
  assert.match(markdown, /2015=29, 2016=28, 2017=26/u);
  assert.match(markdown, /SheetJS\/BIFF \.xls 파서는 dry-run 용도로 승인/u);
  assert.match(markdown, /Service promotion allowed: no/u);
  assert.match(markdown, /서비스 데이터는 변경하지 않음/u);
  assertNoPrivateSourcePath(markdown);
});

test('LEGACY-PREFLIGHT-005 Given 2005-2017 years When auditing expansion queue Then older files are counted without promotion', () => {
  const years = Array.from({ length: 13 }, (_, index) => 2005 + index);
  const report = buildLegacyExpansionPreflightReport({ years });

  assert.equal(report.a3XlsQueue.status, 'ready_for_dry_run');
  assert.equal(report.a3XlsQueue.spreadsheetFiles, 372);
  assert.equal(report.a3XlsQueue.xlsxFiles, 37);
  assert.equal(report.a3XlsQueue.xlsFiles, 335);
  assert.deepEqual(report.a3XlsQueue.byYear, {
    2005: 14,
    2006: 24,
    2007: 24,
    2008: 16,
    2009: 27,
    2010: 33,
    2011: 28,
    2012: 29,
    2013: 29,
    2014: 28,
    2015: 29,
    2016: 28,
    2017: 26,
  });
  assert.equal(report.safety.serviceDataMutated, false);
  assert.equal(report.safety.rawOriginalsTrackedByGit, 0);
  assertNoPrivateSourcePath(report);
});

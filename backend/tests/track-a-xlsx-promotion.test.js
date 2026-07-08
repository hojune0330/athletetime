const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const CANDIDATE_FILE = path.join(
  ROOT,
  '.omo',
  'evidence',
  'legacy-results-normalization',
  'track-a-2015-2017',
  'normalized-candidates.jsonl',
);
const INSPECTION_FILE = path.join(
  ROOT,
  '.omo',
  'evidence',
  'legacy-results-normalization',
  'track-a-2015-2017',
  'xlsx-inspection.json',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runPromotion(extraArgs = []) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-track-a-results-'));
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-track-a-evidence-'));
  const stdout = execFileSync(
    process.execPath,
    [
      'tools/promote-track-a-xlsx-results.js',
      '--candidate-file',
      CANDIDATE_FILE,
      '--inspection-file',
      INSPECTION_FILE,
      '--out-dir',
      outDir,
      '--index',
      path.join(outDir, 'index.json'),
      '--evidence-dir',
      evidenceDir,
      '--dry-run',
      '--json',
      ...extraArgs,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return { outDir, evidenceDir, report: JSON.parse(stdout) };
}

function countRows(yearFile) {
  return readJson(yearFile).reduce((sum, competition) => {
    return sum + competition.events.reduce((eventSum, event) => eventSum + event.results.length, 0);
  }, 0);
}

test('TRACK-A-PROMOTE-001 Given approved XLSX candidates When promoted in dry run Then service-shaped year files are generated', () => {
  const { outDir, evidenceDir, report } = runPromotion();
  try {
    assert.equal(report.candidateRows, 4292);
    assert.equal(report.promotedWorkbooks, 9);
    assert.equal(report.heldWorkbooks.length, 1);
    assert.equal(report.heldWorkbooks[0].reason, 'UNSAFE_EVENT_LABELS');
    assert.deepEqual(report.years, [2015, 2016, 2017]);
    assert.equal(report.deferredXlsFiles, 83);
    assert.equal(report.excludedNonEliteFiles, 1);
    assert.deepEqual(report.byYear, { 2015: 1009, 2016: 1661, 2017: 893 });

    assert.equal(countRows(path.join(outDir, '2015.json')), 1009);
    assert.equal(countRows(path.join(outDir, '2016.json')), 1661);
    assert.equal(countRows(path.join(outDir, '2017.json')), 893);
    assert.equal(fs.existsSync(path.join(outDir, 'index.json')), true);
    assert.equal(fs.existsSync(path.join(evidenceDir, 'promotion-report.json')), true);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test('TRACK-A-PROMOTE-002 Given promoted temp output Then ids, source fields, and public schema are deterministic and safe', () => {
  const { outDir, evidenceDir } = runPromotion();
  try {
    const year2015 = readJson(path.join(outDir, '2015.json'));
    const index = readJson(path.join(outDir, 'index.json'));
    const allText = ['2015', '2016', '2017']
      .map((year) => fs.readFileSync(path.join(outDir, `${year}.json`), 'utf8'))
      .join('\n');

    assert.deepEqual(year2015.map((competition) => competition.competitionId), [
      '2015-track_field-0288',
      '2015-track_field-0318',
      '2015-track_field-0319',
      '2015-track_field-0321',
    ]);
    assert.equal(year2015[0].source, 'kaaf_backfill_xlsx');
    assert.match(year2015[0].sourceFile, /\.xlsx$/);
    assert.equal('sourcePath' in year2015[0], false);
    assert.equal('privateStoragePath' in year2015[0], false);
    assert.equal(index.some((entry) => entry.id === '2015-track_field-0318' && entry.athleteCount > 0), true);
    assert.equal(allText.includes('김국영'), true);
    assert.equal(allText.includes('최선재'), true);
    assert.equal(/privateStoragePath|PERSON_NO|birthDate|birthdate|phone|email|address/i.test(allText), false);
    assert.equal(/legacy_xls_needs_conversion/i.test(allText), false);
    assert.equal(/"name": "성명"|"affiliation": "소속"|"record": "기록"/u.test(allText), false);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test('TRACK-A-PROMOTE-003 Given malformed candidate row When promoting Then it fails before writing output', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-track-a-bad-'));
  try {
    const badCandidate = path.join(temp, 'bad.jsonl');
    const outDir = path.join(temp, 'out');
    fs.writeFileSync(
      badCandidate,
      '{"year":2015,"competitionName":"Bad","event":"100m","rank":1}\n',
      'utf8',
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/promote-track-a-xlsx-results.js',
        '--candidate-file',
        badCandidate,
        '--inspection-file',
        INSPECTION_FILE,
        '--out-dir',
        outDir,
        '--index',
        path.join(outDir, 'index.json'),
        '--dry-run',
        '--json',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /TRACK_A_INVALID_CANDIDATE_ROW/);
    assert.equal(fs.existsSync(outDir), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const evidence = require('../../card-studio/services/athleteHistoryEvidenceService');

const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

const KOREAN = Object.freeze({
  title: '\uC120\uC218\uC774\uB825\uC870\uD68C',
  nameLabel: '\uC131\uBA85',
  name: '\uD64D\uAE38\uB3D9',
  birthLabel: '\uC0DD\uB144\uC6D4\uC77C',
  resultLabel: '\uACBD\uAE30\uC2E4\uC801',
  japanDistanceChallenge: '\uC77C\uBCF8 \uB514\uC2A4\uD134\uC2A4 \uCC4C\uB9B0\uC9C0',
  osakaOpen: '\uC624\uC0AC\uCE74 \uC624\uD508 \uC721\uC0C1\uACBD\uAE30\uB300\uD68C',
  taiwanOpen: '\uB300\uB9CC\uC624\uD508 \uC721\uC0C1\uC120\uC218\uAD8C\uB300\uD68C',
  nationalSportsFestival: '\uC804\uAD6D\uCCB4\uC721\uB300\uD68C',
  busan: '\uBD80\uC0B0',
});

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixtureHistoryText() {
  return `
    ${KOREAN.title}
    ${KOREAN.nameLabel} ${KOREAN.name}
    ${KOREAN.birthLabel} 2000.01.01
    person_no 1234567890
    ${KOREAN.resultLabel}
    2025.12.07 ${KOREAN.japanDistanceChallenge} 5000m 13:45.67 4\uC704 \uC77C\uBCF8
    2025.05.03 ${KOREAN.osakaOpen} 1500m 3:45.12 2\uC704 \uC624\uC0AC\uCE74
    2025.06.01 ${KOREAN.taiwanOpen} 100m 10.35 1\uC704 \uB300\uB9CC
    2025.10.18 ${KOREAN.nationalSportsFestival} 100m 10.40 3\uC704 ${KOREAN.busan}
  `;
}

test('Given self-submitted athlete history text When extracting hints Then overseas events are isolated without identifiers', () => {
  const result = evidence.extractHistoryEvidenceHints(fixtureHistoryText(), {
    consentBasis: 'self_submitted',
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.hints.length, 3);
  assert.deepEqual(
    result.hints.map((hint) => hint.competitionName),
    [KOREAN.japanDistanceChallenge, KOREAN.osakaOpen, KOREAN.taiwanOpen],
  );
  assert.equal(result.updateMode, 'operator_managed_watchlist_only');
  assert.equal(result.rankingPolicy, 'rankings_are_manually_updated_by_owner_or_operator');
  assert.equal(result.hints[0].confirmationStatus, 'needs_external_confirmation');
  assert.equal(result.hints[0].sourceTier, 'athlete_history_discovery_hint');
  assert.equal(result.hints[0].searchQueries.some((query) => query.includes('World Athletics')), true);
  assert.equal(result.hints[1].searchQueries.some((query) => query.includes('JAAF')), true);
  assert.equal(result.hints[2].searchQueries.some((query) => query.includes('Taiwan')), true);

  assert.equal(serialized.includes(KOREAN.name), false);
  assert.equal(serialized.includes('2000.01.01'), false);
  assert.equal(serialized.includes('person_no'), false);
  assert.equal(serialized.includes('1234567890'), false);
  assert.equal(serialized.includes(KOREAN.nationalSportsFestival), false);
});

test('Given CLI input When extracting athlete history evidence Then output and report remain sanitized', async () => {
  const root = tempDir('athletetime-athlete-history-evidence-');
  const inputPath = path.join(root, 'history.txt');
  const outputPath = path.join(root, 'hints.json');
  const reportPath = path.join(root, 'hints.md');

  try {
    fs.writeFileSync(inputPath, fixtureHistoryText(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/extract-athlete-history-evidence.js',
      '--input',
      inputPath,
      '--output',
      outputPath,
      '--report',
      reportPath,
      '--self-submitted',
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });
    const summary = JSON.parse(stdout);
    const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const report = fs.readFileSync(reportPath, 'utf8');

    assert.equal(summary.ok, true);
    assert.equal(summary.hints, 3);
    assert.equal(output.hints.length, 3);
    assert.match(report, /Athlete history overseas-result discovery hints/);
    assert.match(report, /Ranking policy: rankings_are_manually_updated_by_owner_or_operator/);
    assert.equal(JSON.stringify({ output, report }).includes(KOREAN.name), false);
    assert.equal(JSON.stringify({ output, report }).includes('person_no'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

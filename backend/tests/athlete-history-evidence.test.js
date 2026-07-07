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

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixtureHistoryText() {
  return `
    선수이력조회
    성명 홍길동
    생년월일 2000.01.01
    person_no 1234567890
    경기실적
    2025.12.07 일본 디스턴스 챌린지 5000m 13:45.67 4위 일본
    2025.05.03 오사카 오픈 육상경기대회 1500m 3:45.12 2위 오사카
    2025.06.01 대만오픈 육상선수권대회 100m 10.35 1위 타이베이
    2025.10.18 전국체육대회 100m 10.40 3위 부산
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
    ['일본 디스턴스 챌린지', '오사카 오픈 육상경기대회', '대만오픈 육상선수권대회'],
  );
  assert.equal(result.hints[0].confirmationStatus, 'needs_external_confirmation');
  assert.equal(result.hints[0].sourceTier, 'athlete_history_discovery_hint');
  assert.equal(result.hints[0].searchQueries.some((query) => query.includes('World Athletics')), true);
  assert.equal(result.hints[1].searchQueries.some((query) => query.includes('JAAF')), true);
  assert.equal(result.hints[2].searchQueries.some((query) => query.includes('Taiwan')), true);

  assert.equal(serialized.includes('홍길동'), false);
  assert.equal(serialized.includes('2000.01.01'), false);
  assert.equal(serialized.includes('person_no'), false);
  assert.equal(serialized.includes('1234567890'), false);
  assert.equal(serialized.includes('전국체육대회'), false);
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
    assert.match(report, /선수이력 기반 해외대회 발견 힌트/);
    assert.equal(JSON.stringify({ output, report }).includes('홍길동'), false);
    assert.equal(JSON.stringify({ output, report }).includes('person_no'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

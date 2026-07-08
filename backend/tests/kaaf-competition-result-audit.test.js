const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const audit = require('../../card-studio/services/kaafCompetitionResultAuditService');

const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixtureAnnualPage() {
  return `
    <table class="th_top_02">
      <tr>
        <th>월</th><th>대회명</th><th>기간</th><th>장소</th><th>파일</th>
      </tr>
      <tr>
        <td>03월 </td>
        <td class="left"><a href="view.asp?YEAR=2025&SEQ=1138&WPAGE=1">
          제11회 예천도효자배 전국고교10km대회 겸 중학교 5km대회
        </a></td>
        <td>03.08</td>
        <td>예천</td>
        <td>
          <a class="btnS i_file" alt="요강" href="https://www.kaaf.or.kr//DATA/schedule/2025/02/FILEs_1//25-11 제11회도효자배대회요강20250213(0).hwp"></a>
          <a class="btnS i_file" alt="결과다운로드" href="https://www.kaaf.or.kr//DATA/schedule/2025/03/FILEs_4//종합기록지20250312.pdf"></a>
        </td>
      </tr>
      <tr>
        <td>03월 </td>
        <td class="left"><a href="view.asp?YEAR=2016&SEQ=498&WPAGE=1">
          2016 예천 도효자배전국고교10km대회 겸 중학교5km대회
        </a></td>
        <td>03.06</td>
        <td>예천</td>
        <td>
          <a class="btnS i_file" alt="요강" href="/DATA/schedule/2016/02/FILEs_1/16-02 제2회도효자배대회요강20160214.hwp"></a>
        </td>
      </tr>
      <tr>
        <td>04월 </td>
        <td class="left"><a href="view.asp?YEAR=2025&SEQ=1139&WPAGE=1">
          제54회 춘계전국중고육상경기대회
        </a></td>
        <td>04.12 ~ 04.16</td>
        <td>예천</td>
        <td>
          <a class="btnS i_file" alt="결과다운로드" href="/DATA/schedule/2025/04/FILEs_4/결과기록지20250422.pdf"></a>
        </td>
      </tr>
    </table>
  `;
}

test('Given generic result filenames When auditing by competition name Then row context identifies Dohyoja files', () => {
  const result = audit.auditCompetitionResultRows(fixtureAnnualPage(), {
    query: '도효자',
    sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2025',
    year: 2025,
  });

  assert.equal(result.query, '도효자');
  assert.equal(result.matches.length, 2);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.missingResultRows.length, 1);

  assert.equal(result.candidates[0].competitionName, '제11회 예천도효자배 전국고교10km대회 겸 중학교 5km대회');
  assert.equal(result.candidates[0].competitionPeriod, '03.08');
  assert.equal(result.candidates[0].venue, '예천');
  assert.equal(result.candidates[0].originalFilename, '종합기록지20250312.pdf');
  assert.equal(result.candidates[0].title, '제11회 예천도효자배 전국고교10km대회 겸 중학교 5km대회 — 종합기록지20250312.pdf');
  assert.equal(result.candidates[0].detailUrl, 'https://kaaf.or.kr/ver3/info/view.asp?YEAR=2025&SEQ=1138&WPAGE=1');

  assert.equal(result.missingResultRows[0].competitionName, '2016 예천 도효자배전국고교10km대회 겸 중학교5km대회');
  assert.equal(result.missingResultRows[0].reason, 'no_result_file_attachment');
});

test('Given CLI fixture When auditing competition result coverage Then compact JSON and report are written', async () => {
  const root = tempDir('athletetime-kaaf-competition-audit-');
  const pagePath = path.join(root, 'page.html');
  const outputPath = path.join(root, 'audit.json');
  const reportPath = path.join(root, 'audit.md');

  try {
    fs.writeFileSync(pagePath, fixtureAnnualPage(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/audit-kaaf-competition-results.js',
      '--query',
      '도효자',
      '--page-file',
      pagePath,
      '--source-url',
      'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2025',
      '--year',
      '2025',
      '--output',
      outputPath,
      '--report',
      reportPath,
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });

    const result = JSON.parse(stdout);
    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

    assert.equal(result.ok, true);
    assert.equal(result.candidates, 1);
    assert.equal(result.missingResultRows, 1);
    assert.equal(written.candidates[0].competitionName.includes('도효자배'), true);
    assert.match(fs.readFileSync(reportPath, 'utf8'), /KAAF 대회명 기반 결과파일 누락 감사/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const harvester = require('../../card-studio/services/kaafScheduleResultHarvesterService');
const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixtureHtml() {
  return `
    <a class="btnS i_file" alt="요강" href="https://www.kaaf.or.kr//DATA/schedule/2026/03/FILEs_1//대회요강.hwp"></a>
    <a class="btnS i_file" alt="일정" href="https://www.kaaf.or.kr//DATA/schedule/2026/04/FILEs_2//경기일정.hwp"></a>
    <a class="btnS i_file" alt="결과파일" href="https://www.kaaf.or.kr//DATA/schedule/2026/04/FILEs_4//종합결과.xlsx"></a>
    <a class="btnS i_file" alt="결과파일" href="https://www.kaaf.or.kr//DATA/schedule/2026/04/FILEs_4//종합결과.xlsx"></a>
    <a class="btnS i_file" alt="결과파일" href="https://www.kaaf.or.kr/DATA/schedule/2026/05/FILEs_4/최종 결과.pdf"></a>
    <a class="btnS i_file" alt="결과파일" href="https://kaaf.or.kr/DATA/recordsport/남자기록최종.xlsx"></a>
    <a class="btnS i_file" alt="결과파일" href="https://result.kaaf.or.kr/live/results.xlsx"></a>
    <a class="btnS i_file" alt="결과파일" href="/DATA/schedule/2026/06/FILEs_4/생활체육 종합결과.xlsx"></a>
  `;
}

test('KAAF-HARVEST-001 extracts only deduped non-life-sport FILEs_4 result attachments', () => {
  const result = harvester.extractScheduleResultFiles(fixtureHtml(), {
    sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
    year: 2026,
  });

  assert.equal(result.candidates.length, 2);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.originalFilename),
    ['종합결과.xlsx', '최종 결과.pdf'],
  );
  assert.equal(result.excluded.length, 5);
  assert.ok(result.excluded.some((item) => item.reason === 'not_result_file_slot'));
  assert.ok(result.excluded.some((item) => item.reason === 'life_sports_excluded'));
  assert.ok(result.excluded.some((item) => item.reason === 'blocked_host'));

  for (const candidate of result.candidates) {
    assert.equal(candidate.provider, '대한육상연맹');
    assert.equal(candidate.sourceClass, 'kaaf_schedule_result_attachment');
    assert.equal(candidate.collectionAction, 'download_file');
    assert.equal(candidate.reviewStatus, 'approved');
    assert.equal(candidate.extractionMethod, 'kaaf_internal_file_slot_4');
    assert.equal(candidate.robotsPosture, 'kaaf_public_schedule_attachment');
    assert.match(candidate.downloadUrl, /^https:\/\/(www\.)?kaaf\.or\.kr\/DATA\/schedule\/2026\//);
    assert.equal(candidate.downloadUrl.includes('/FILEs_4/'), true);
    assert.equal(candidate.downloadUrl.includes('/DATA/recordsport/'), false);
  }
});

test('KAAF-HARVEST-002 builds year page URLs without touching result.kaaf.or.kr', () => {
  assert.deepEqual(harvester.buildYearPageUrls({ fromYear: 2024, toYear: 2026 }), [
    'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2024',
    'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2025',
    'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
  ]);
});

test('KAAF-HARVEST-004 keeps legacy OLD FILEs_4 attachments as approved result candidates', () => {
  const result = harvester.extractScheduleResultFiles(
    '<a href="https://www.kaaf.or.kr/DATA/schedule/OLD/FILEs_4//05child_result.xls">결과</a>',
    { sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2005', year: 2005 },
  );

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].year, 2005);
  assert.equal(result.candidates[0].originalFilename, '05child_result.xls');
  assert.equal(result.candidates[0].collectionAction, 'download_file');
  assert.equal(result.candidates[0].reviewStatus, 'approved');
  assert.match(result.candidates[0].downloadUrl, /\/DATA\/schedule\/OLD\/FILEs_4\/\//);
});

test('KAAF-HARVEST-005 discovery CLI writes candidate JSON and report without downloading files', async () => {
  const root = tempDir('athletetime-kaaf-discovery-cli-');
  const pagePath = path.join(root, 'page.html');
  const outputPath = path.join(root, 'candidates.json');
  const reportPath = path.join(root, 'report.md');

  try {
    fs.writeFileSync(pagePath, fixtureHtml(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/discover-kaaf-result-sources.js',
      '--page-file',
      pagePath,
      '--source-url',
      'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
      '--year',
      '2026',
      '--output',
      outputPath,
      '--report',
      reportPath,
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });
    const result = JSON.parse(stdout);
    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

    assert.equal(result.ok, true);
    assert.equal(result.totalCandidates, 2);
    assert.equal(written.candidates.length, 2);
    assert.equal(written.files, undefined);
    assert.match(fs.readFileSync(reportPath, 'utf8'), /KAAF 경기결과 후보 발견 보고서/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('KAAF-HARVEST-003 downloads direct result files and writes manifest without raw body', async () => {
  const body = Buffer.from('official result file fixture');
  const server = http.createServer((req, res) => {
    if (req.url === '/DATA/schedule/2026/04/FILEs_4/result.xlsx') {
      res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  const address = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
  const storageRoot = tempDir('athletetime-kaaf-harvest-files-');
  const reportDir = tempDir('athletetime-kaaf-harvest-report-');

  try {
    const run = await harvester.downloadScheduleResultFiles(
      [
        {
          provider: '대한육상연맹',
          sourceClass: 'kaaf_schedule_result_attachment',
          collectionAction: 'download_file',
          title: 'result.xlsx',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
          downloadUrl: `http://127.0.0.1:${address.port}/DATA/schedule/2026/04/FILEs_4/result.xlsx`,
          originalFilename: 'result.xlsx',
          year: 2026,
        },
      ],
      { storageRoot, reportDir, batchName: 'fixture-batch', now: '2026-06-25T00:00:00.000Z' },
    );

    assert.equal(run.downloaded, 1);
    assert.equal(run.failed, 0);
    assert.equal(fs.existsSync(run.manifestPath), true);
    assert.equal(fs.existsSync(run.reportPath), true);
    assert.equal(fs.readFileSync(run.files[0].filePath).equals(body), true);

    const manifest = JSON.parse(fs.readFileSync(run.manifestPath, 'utf8'));
    assert.equal(manifest.files[0].rawFileBody, undefined);
    assert.equal(manifest.files[0].sha256.length, 64);
    assert.equal(manifest.files[0].privateStoragePath.includes('data/sources/import/originals/'), false);
  } finally {
    server.close();
    fs.rmSync(storageRoot, { recursive: true, force: true });
    fs.rmSync(reportDir, { recursive: true, force: true });
  }
});

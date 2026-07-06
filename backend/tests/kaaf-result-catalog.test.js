const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const catalog = require('../../card-studio/services/kaafResultCatalogService');
const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixtureFile(root, name, body) {
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, body);
  return filePath;
}

function fixtureManifest(root) {
  const first = fixtureFile(root, '001_2026 코오롱 종합결과20260328.xlsx', Buffer.from('PK fixture'));
  const duplicate = fixtureFile(root, '002_2026 코오롱 종합결과 복사본.xlsx', Buffer.from('PK fixture'));
  const pdf = fixtureFile(root, '003_인천하프 종합기록지20260326.pdf', Buffer.from('%PDF fixture'));
  return {
    files: [
      {
        originalFilename: '2026 코오롱 종합결과20260328.xlsx',
        sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/03/FILEs_4/cologne.xlsx',
        privateStoragePath: first,
        filePath: first,
        year: 2026,
        sha256: 'a'.repeat(64),
        fileSize: fs.statSync(first).size,
      },
      {
        originalFilename: '2026 코오롱 종합결과 복사본.xlsx',
        sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/03/FILEs_4/cologne-copy.xlsx',
        privateStoragePath: duplicate,
        filePath: duplicate,
        year: 2026,
        sha256: 'a'.repeat(64),
        fileSize: fs.statSync(duplicate).size,
      },
      {
        originalFilename: '인천하프 종합기록지20260326.pdf',
        sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2026',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/03/FILEs_4/incheon-half.pdf',
        privateStoragePath: pdf,
        filePath: pdf,
        year: 2026,
        sha256: 'b'.repeat(64),
        fileSize: fs.statSync(pdf).size,
      },
    ],
  };
}

test('CAT-001 Given a manifest When building a catalog Then each file has stable canonical organization fields', () => {
  const root = tempDir('athletetime-kaaf-catalog-');
  try {
    const result = catalog.buildCatalog(fixtureManifest(root));

    assert.equal(result.entries.length, 3);
    assert.equal(result.entries[0].canonicalId, 'kaaf-result-2026-aaaaaaaaaaaa');
    assert.equal(result.entries[0].normalizedTitle, '2026 코오롱 종합결과');
    assert.equal(result.entries[0].season, 2026);
    assert.equal(result.entries[0].extension, '.xlsx');
    assert.equal(result.entries[0].magicType, 'zip_office');
    assert.equal(result.entries[0].sourceTier, 'kaaf_schedule_result_file');
    assert.equal(result.entries[0].rawBody, undefined);
    assert.ok(result.entries[0].searchText.includes('코오롱'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-002 Given repeated sha256 files When building a catalog Then duplicate groups are explicit', () => {
  const root = tempDir('athletetime-kaaf-catalog-dupes-');
  try {
    const result = catalog.buildCatalog(fixtureManifest(root));

    assert.equal(result.stats.duplicateGroups.length, 1);
    assert.equal(result.stats.duplicateGroups[0].sha256, 'a'.repeat(64));
    assert.deepEqual(
      result.stats.duplicateGroups[0].canonicalIds,
      ['kaaf-result-2026-aaaaaaaaaaaa', 'kaaf-result-2026-aaaaaaaaaaaa-2'],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-003 Given catalog entries When searching by query and filters Then canonical hits explain match fields', () => {
  const root = tempDir('athletetime-kaaf-catalog-search-');
  try {
    const result = catalog.buildCatalog(fixtureManifest(root));
    const hits = catalog.searchCatalog(result, { query: '하프', season: 2026, extension: '.pdf' });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].normalizedTitle, '인천하프 종합기록지');
    assert.deepEqual(hits[0].matchFields, ['title']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-004 Given a catalog When summarizing Then year and extension buckets are deterministic', () => {
  const root = tempDir('athletetime-kaaf-catalog-summary-');
  try {
    const result = catalog.buildCatalog(fixtureManifest(root));
    const repeated = catalog.buildCatalog(fixtureManifest(root));

    assert.deepEqual(repeated, result);
    assert.equal(result.generatedAt, undefined);
    assert.deepEqual(result.stats.bySeason, { 2026: 3 });
    assert.deepEqual(result.stats.byExtension, { '.pdf': 1, '.xlsx': 2 });
    assert.deepEqual(result.stats.byMagicType, { pdf: 1, zip_office: 2 });
    assert.deepEqual(result.stats.byCategoryHint, { road: 1, track_field: 2 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-005 Given CLI invocation When writing catalog artifacts Then JSON catalog and Markdown report are created', async () => {
  const root = tempDir('athletetime-kaaf-catalog-cli-');
  const manifestPath = path.join(root, 'manifest.json');
  const outputPath = path.join(root, 'catalog.json');
  const reportPath = path.join(root, 'catalog.md');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(fixtureManifest(root), null, 2), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/build-kaaf-result-catalog.js',
      '--manifest',
      manifestPath,
      '--output',
      outputPath,
      '--report',
      reportPath,
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });
    const result = JSON.parse(stdout);

    assert.equal(result.ok, true);
    assert.equal(fs.existsSync(outputPath), true);
    assert.equal(fs.existsSync(reportPath), true);
    assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).entries.length, 3);
    assert.match(fs.readFileSync(reportPath, 'utf8'), /KAAF Canonical Result Catalog/);
    assert.match(fs.readFileSync(reportPath, 'utf8'), /By Category Hint/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-006 Given CLI search filters When searching catalog Then only matching canonical entries are returned', async () => {
  const root = tempDir('athletetime-kaaf-catalog-cli-search-');
  const manifestPath = path.join(root, 'manifest.json');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(fixtureManifest(root), null, 2), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/build-kaaf-result-catalog.js',
      '--manifest',
      manifestPath,
      '--search',
      '하프',
      '--season',
      '2026',
      '--extension',
      '.pdf',
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });
    const result = JSON.parse(stdout);

    assert.equal(result.ok, true);
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].normalizedTitle, '인천하프 종합기록지');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CAT-007 Given noisy KAAF filenames When building a catalog Then normalized titles remove copy and repeated-date noise', () => {
  const root = tempDir('athletetime-kaaf-catalog-noise-');
  try {
    const filePath = fixtureFile(root, '004_복사본 춘계기록지_2020082720201230(0).xlsx', Buffer.from('PK fixture'));
    const versionedPath = fixtureFile(root, '005_43회춘계종합기록지 (2)20140425.xls', Buffer.from('PK fixture'));
    const dateVersionPath = fixtureFile(root, '006_익산대학대회20220616 (1)20220622(0).pdf', Buffer.from('%PDF fixture'));
    const prefixedDatePath = fixtureFile(root, '007_제38회 KBS전국육상경기대회 종합기록120100626.xls', Buffer.from('PK fixture'));
    const compactMarkerPath = fixtureFile(root, '008_46회추계종합기록지520170816(0).xls', Buffer.from('PK fixture'));
    const spacedMarkerPath = fixtureFile(root, '009_2024 전국체전 종합_120251217.xlsx', Buffer.from('PK fixture'));
    const result = catalog.buildCatalog({
      files: [
        {
          originalFilename: '복사본 춘계기록지_2020082720201230(0).xlsx',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2020',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2020/12/FILEs_4/spring.xlsx',
          privateStoragePath: filePath,
          filePath,
          year: 2020,
          sha256: 'c'.repeat(64),
          fileSize: fs.statSync(filePath).size,
        },
        {
          originalFilename: '43회춘계종합기록지 (2)20140425.xls',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2014',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2014/04/FILEs_4/spring.xls',
          privateStoragePath: versionedPath,
          filePath: versionedPath,
          year: 2014,
          sha256: 'd'.repeat(64),
          fileSize: fs.statSync(versionedPath).size,
        },
        {
          originalFilename: '익산대학대회20220616 (1)20220622(0).pdf',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2022',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2022/06/FILEs_4/iksan.pdf',
          privateStoragePath: dateVersionPath,
          filePath: dateVersionPath,
          year: 2022,
          sha256: 'e'.repeat(64),
          fileSize: fs.statSync(dateVersionPath).size,
        },
        {
          originalFilename: '제38회 KBS전국육상경기대회 종합기록120100626.xls',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2010',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2010/06/FILEs_4/kbs.xls',
          privateStoragePath: prefixedDatePath,
          filePath: prefixedDatePath,
          year: 2010,
          sha256: 'f'.repeat(64),
          fileSize: fs.statSync(prefixedDatePath).size,
        },
        {
          originalFilename: '46회추계종합기록지520170816(0).xls',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2017',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2017/08/FILEs_4/fall.xls',
          privateStoragePath: compactMarkerPath,
          filePath: compactMarkerPath,
          year: 2017,
          sha256: '0'.repeat(64),
          fileSize: fs.statSync(compactMarkerPath).size,
        },
        {
          originalFilename: '2024 전국체전 종합_120251217.xlsx',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2025',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2025/12/FILEs_4/national.xlsx',
          privateStoragePath: spacedMarkerPath,
          filePath: spacedMarkerPath,
          year: 2025,
          sha256: '1'.repeat(64),
          fileSize: fs.statSync(spacedMarkerPath).size,
        },
      ],
    });

    assert.equal(result.entries[0].normalizedTitle, '춘계기록지');
    assert.equal(result.entries[0].originalFilename, '복사본 춘계기록지_2020082720201230(0).xlsx');
    assert.equal(result.entries[1].normalizedTitle, '43회춘계종합기록지');
    assert.equal(result.entries[2].normalizedTitle, '익산대학대회');
    assert.equal(result.entries[3].normalizedTitle, '제38회 KBS전국육상경기대회 종합기록');
    assert.equal(result.entries[4].normalizedTitle, '46회추계종합기록지');
    assert.equal(result.entries[5].normalizedTitle, '2024 전국체전 종합');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

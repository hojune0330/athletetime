const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const catalog = require('../../card-studio/services/kaafResultCatalogService');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('Given manifest competition context When building catalog Then generic filenames remain searchable by competition name', () => {
  const root = tempDir('athletetime-kaaf-catalog-context-');
  const filePath = path.join(root, '001_종합기록지20250312.pdf');

  try {
    fs.writeFileSync(filePath, Buffer.from('%PDF fixture'));
    const result = catalog.buildCatalog({
      files: [
        {
          competitionName: '제11회 예천도효자배 전국고교10km대회 겸 중학교 5km대회',
          competitionPeriod: '03.08',
          venue: '예천',
          detailUrl: 'https://kaaf.or.kr/ver3/info/view.asp?YEAR=2025&SEQ=1138&WPAGE=1',
          originalFilename: '종합기록지20250312.pdf',
          sourceUrl: 'https://kaaf.or.kr/ver3/info/internal.asp?currentYear=2025',
          downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2025/03/FILEs_4/result.pdf',
          privateStoragePath: filePath,
          filePath,
          year: 2025,
          sha256: '1'.repeat(64),
          fileSize: fs.statSync(filePath).size,
        },
      ],
    });
    const hits = catalog.searchCatalog(result, { query: '도효자', season: 2025 });

    assert.equal(result.entries[0].competitionName, '제11회 예천도효자배 전국고교10km대회 겸 중학교 5km대회');
    assert.equal(result.entries[0].venue, '예천');
    assert.equal(hits.length, 1);
    assert.deepEqual(hits[0].matchFields, ['competition']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

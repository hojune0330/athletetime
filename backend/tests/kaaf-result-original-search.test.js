const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const search = require('../../card-studio/services/kaafResultOriginalSearchService');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFixtureFile(root, name, body) {
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, body);
  return filePath;
}

function fixtureManifest(root) {
  const utf16File = writeFixtureFile(root, '001_result.xls', Buffer.from('심종섭 100m 10.50', 'utf16le'));
  const nameFile = writeFixtureFile(root, '002_2026 코오롱 종합결과.xlsx', Buffer.from('zip-ish fixture'));
  const blockedFile = writeFixtureFile(root, '003_생활체육.xlsx', Buffer.from('bad fixture'));
  return {
    files: [
      {
        originalFilename: '001_result.xls',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/04/FILEs_4/result.xls',
        privateStoragePath: utf16File,
        filePath: utf16File,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(utf16File)).digest('hex'),
        fileSize: fs.statSync(utf16File).size,
      },
      {
        originalFilename: '002_2026 코오롱 종합결과.xlsx',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/04/FILEs_4/cologne.xlsx',
        privateStoragePath: nameFile,
        filePath: nameFile,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(nameFile)).digest('hex'),
        fileSize: fs.statSync(nameFile).size,
      },
      {
        originalFilename: '003_생활체육.xlsx',
        downloadUrl: 'https://www.kaaf.or.kr/DATA/schedule/2026/04/FILEs_4/life.xlsx',
        privateStoragePath: blockedFile,
        filePath: blockedFile,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(blockedFile)).digest('hex'),
        fileSize: fs.statSync(blockedFile).size,
      },
    ],
  };
}

test('Given original result files When auditing manifest Then hash and policy violations are reported', () => {
  const root = tempDir('athletetime-kaaf-original-audit-');
  try {
    const audit = search.auditManifest(fixtureManifest(root));

    assert.equal(audit.total, 3);
    assert.equal(audit.existing, 3);
    assert.equal(audit.hashMismatches, 0);
    assert.equal(audit.policyViolations.length, 1);
    assert.equal(audit.policyViolations[0].originalFilename, '003_생활체육.xlsx');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Given a player query When searching originals Then UTF-16 file content matches without exposing raw body', () => {
  const root = tempDir('athletetime-kaaf-original-search-');
  try {
    const result = search.searchOriginals(fixtureManifest(root), '심종섭');

    assert.equal(result.query, '심종섭');
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].originalFilename, '001_result.xls');
    assert.deepEqual(result.hits[0].matchTypes, ['content_utf16le']);
    assert.equal(Object.hasOwn(result.hits[0], 'rawBody'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Given a competition query When searching originals Then filename metadata matches', () => {
  const root = tempDir('athletetime-kaaf-original-metadata-search-');
  try {
    const result = search.searchOriginals(fixtureManifest(root), '코오롱');

    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].originalFilename, '002_2026 코오롱 종합결과.xlsx');
    assert.deepEqual(result.hits[0].matchTypes, ['metadata']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

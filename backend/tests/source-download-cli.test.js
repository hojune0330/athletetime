const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const sourceLedger = require('../../card-studio/services/sourceLedgerService');

const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(ledgerPath, storageRoot) {
  fs.rmSync(path.dirname(ledgerPath), { recursive: true, force: true });
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

function createServer(body) {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    requestCount += 1;
    res.writeHead(200, { 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/fixture.xlsx`, requestCount: () => requestCount });
    });
  });
}

function createDownloadSource(downloadUrl, overrides = {}, options = {}) {
  return sourceLedger.createSource({
    provider: '대한육상연맹',
    sourceClass: 'public_official_attachment',
    collectionAction: 'download_file',
    title: 'fixture official file',
    sourceUrl: 'https://kaaf.or.kr/ver3/info/recordsport.asp?tn=tblRecordSports',
    downloadUrl,
    originalFilename: 'fixture.xlsx',
    licenseType: 'unknown_kaaf_public_attachment',
    reviewStatus: 'approved',
    extractionMethod: 'official_file_import',
    ...overrides,
  }, options);
}

test('SRC-DL-CLI-001: Given a ledger source When CLI downloads Then JSON result points to saved private file', async () => {
  const body = Buffer.from('cli fixture');
  const { server, url } = await createServer(body);
  const ledgerPath = path.join(tempDir('athletetime-cli-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-cli-files-');

  try {
    const source = createDownloadSource(url, {}, { ledgerPath });
    const { stdout } = await execFileAsync(process.execPath, [
      'tools/download-source.js',
      '--source-id',
      source.source.sourceId,
      '--ledger',
      ledgerPath,
      '--storage-root',
      storageRoot,
      '--json',
    ], { cwd: rootDir, encoding: 'utf8' });
    const result = JSON.parse(stdout);

    assert.equal(result.ok, true);
    assert.equal(fs.existsSync(result.filePath), true);
    assert.equal(result.bytes, body.length);
  } finally {
    server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-CLI-002: Given an unapproved ledger source When CLI downloads Then it exits nonzero with typed error', async () => {
  const body = Buffer.from('cli reject fixture');
  const fixture = await createServer(body);
  const ledgerPath = path.join(tempDir('athletetime-cli-reject-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-cli-reject-files-');

  try {
    const source = createDownloadSource(fixture.url, { reviewStatus: 'candidate_review' }, { ledgerPath });
    await assert.rejects(
      execFileAsync(process.execPath, [
        'tools/download-source.js',
        '--source-id',
        source.source.sourceId,
        '--ledger',
        ledgerPath,
        '--storage-root',
        storageRoot,
        '--json',
      ], { cwd: rootDir, encoding: 'utf8' }),
      (error) => {
        const result = JSON.parse(error.stdout);
        assert.equal(result.ok, false);
        assert.equal(result.error.code, 'SOURCE_DOWNLOAD_NOT_APPROVED');
        assert.equal(fixture.requestCount(), 0);
        return true;
      },
    );
  } finally {
    fixture.server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

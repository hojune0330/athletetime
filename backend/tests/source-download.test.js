const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const sourceDownload = require('../../card-studio/services/sourceDownloadService');
const sourceLedger = require('../../card-studio/services/sourceLedgerService');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function cleanup(ledgerPath, storageRoot) {
  removePath(path.dirname(ledgerPath));
  removePath(storageRoot);
}

function createServer(body, contentType = 'application/octet-stream', statusCode = 200, extraHeaders = {}) {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    requestCount += 1;
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
      ...extraHeaders,
    });
    res.end(body);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/fixture.xlsx`,
        requestCount: () => requestCount,
      });
    });
  });
}

function createDownloadSource(downloadUrl, overrides = {}, options = {}) {
  return sourceLedger.createSource(
    {
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
    },
    options,
  );
}

function writeSourceLedger(ledgerPath, source) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, JSON.stringify([source], null, 2), 'utf8');
}

test('SRC-DL-001-private-storage-root: Given downloader defaults When inspected Then originals stay under private ignored data sources path', () => {
  const normalized = sourceDownload.DEFAULT_STORAGE_ROOT.replace(/\\/g, '/');
  assert.match(normalized, /data\/sources\/import\/originals$/);
});

test('SRC-DL-002-approved-only: Given an unapproved download source When downloading Then no request is sent', async () => {
  const body = Buffer.from('must not be fetched');
  const fixture = await createServer(body);
  const ledgerPath = path.join(tempDir('athletetime-unapproved-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-unapproved-files-');

  try {
    const source = createDownloadSource(
      fixture.url,
      { reviewStatus: 'candidate_review' },
      { ledgerPath, now: '2026-06-24T00:00:00.000Z' },
    );
    const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SOURCE_DOWNLOAD_NOT_APPROVED');
    assert.equal(fixture.requestCount(), 0);
    assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId)), false);
  } finally {
    fixture.server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-003-block-result-kaaf: Given a blocked host source When downloading Then it is rejected before storage', async () => {
  const ledgerPath = path.join(tempDir('athletetime-blocked-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-blocked-files-');

  try {
    const source = createDownloadSource(
      'https://result.kaaf.or.kr/recInfo/topRecList.do',
      { robotsPosture: 'disallow_all' },
      { ledgerPath },
    );
    const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SOURCE_DOWNLOAD_BLOCKED');
    assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId)), false);
  } finally {
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-005-download-metadata: Given an approved ledgered source When downloading Then private file and metadata are persisted', async () => {
  const body = Buffer.from('athletetime official file fixture');
  const { server, url } = await createServer(body, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const ledgerPath = path.join(tempDir('athletetime-download-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-source-files-');

  try {
    const source = createDownloadSource(url, {}, { ledgerPath, now: '2026-06-24T00:00:00.000Z' });
    const result = await sourceDownload.downloadSource(source.source.sourceId, {
      ledgerPath,
      storageRoot,
      now: '2026-06-24T00:01:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.bytes, body.length);
    assert.equal(result.sha256, crypto.createHash('sha256').update(body).digest('hex'));
    assert.equal(fs.existsSync(result.filePath), true);
    assert.deepEqual(fs.readFileSync(result.filePath), body);

    const updated = sourceLedger.readSource(source.source.sourceId, { ledgerPath });
    assert.equal(updated.downloadStatus, 'downloaded');
    assert.equal(updated.sha256, result.sha256);
    assert.equal(updated.fileSize, body.length);
    assert.equal(updated.downloadError, null);
    assert.match(updated.privateStoragePath, /data\/sources\/import\/originals|athletetime-source-files-/);
    assert.equal(updated.rawFileBody, undefined);
  } finally {
    server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-004-malformed-source: Given a non-download reference source When downloading Then no file is written', async () => {
  const ledgerPath = path.join(tempDir('athletetime-reference-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-reference-files-');
  const source = sourceLedger.createSource(
    {
      provider: '대한육상연맹',
      sourceClass: 'public_reference_table',
      collectionAction: 'fetch_reference_table',
      title: 'KAAF 부별기록',
      sourceUrl: 'https://kaaf.or.kr/ver3/info/divisional.asp',
      licenseType: 'unknown_kaaf_public_reference',
      reviewStatus: 'candidate_review',
      extractionMethod: 'reference_table_fetch',
    },
    { ledgerPath, now: '2026-06-24T00:00:00.000Z' },
  );

  const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'SOURCE_NOT_DOWNLOADABLE');
  assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId)), false);
  cleanup(ledgerPath, storageRoot);
});

test('SRC-DL-007-path-containment: Given a path traversal filename When downloading Then the file stays inside source directory', async () => {
  const body = Buffer.from('safe path fixture');
  const { server, url } = await createServer(body);
  const ledgerPath = path.join(tempDir('athletetime-safe-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-safe-files-');

  try {
    const source = createDownloadSource(url, { originalFilename: '../evil.xlsx' }, { ledgerPath });
    const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });

    assert.equal(result.ok, true);
    assert.equal(path.dirname(result.filePath), path.join(storageRoot, source.source.sourceId));
    assert.equal(path.basename(result.filePath), 'evil.xlsx');
    assert.equal(fs.existsSync(path.join(storageRoot, 'evil.xlsx')), false);
  } finally {
    server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-009-source-id-containment: Given a path traversal sourceId When downloading Then the storage root is not escaped', async () => {
  const body = Buffer.from('source id escape fixture');
  const fixture = await createServer(body);
  const ledgerPath = path.join(tempDir('athletetime-source-id-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-source-id-files-');
  const escapedPath = path.join(path.dirname(storageRoot), 'escaped-source');

  try {
    removePath(escapedPath);
    writeSourceLedger(ledgerPath, {
      sourceId: '../escaped-source',
      provider: '대한육상연맹',
      sourceClass: 'public_official_attachment',
      collectionAction: 'download_file',
      title: 'escaped source id',
      sourceUrl: 'https://kaaf.or.kr/ver3/info/recordsport.asp?tn=tblRecordSports',
      downloadUrl: fixture.url,
      originalFilename: 'fixture.xlsx',
      licenseType: 'unknown_kaaf_public_attachment',
      reviewStatus: 'approved',
      extractionMethod: 'official_file_import',
      robotsPosture: 'allowed_public_path',
    });
    const result = await sourceDownload.downloadSource('../escaped-source', { ledgerPath, storageRoot });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SOURCE_DOWNLOAD_PATH_ESCAPE');
    assert.equal(fixture.requestCount(), 0);
    assert.equal(fs.existsSync(escapedPath), false);
  } finally {
    fixture.server.close();
    removePath(escapedPath);
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-006-http-failure-cleanup: Given an HTTP failure When downloading Then failed status is stored without a partial file', async () => {
  const fixture = await createServer(Buffer.from('not found'), 'text/plain', 404);
  const ledgerPath = path.join(tempDir('athletetime-failed-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-failed-files-');

  try {
    const source = createDownloadSource(fixture.url, {}, { ledgerPath });
    const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });
    const updated = sourceLedger.readSource(source.source.sourceId, { ledgerPath });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SOURCE_DOWNLOAD_HTTP_ERROR');
    assert.equal(updated.downloadStatus, 'failed');
    assert.equal(updated.downloadError, 'SOURCE_DOWNLOAD_HTTP_ERROR');
    assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId, 'fixture.xlsx')), false);
    assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId, 'fixture.xlsx.tmp')), false);
  } finally {
    fixture.server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

test('SRC-DL-008-redirect-blocked-host: Given a redirect to blocked host When downloading Then it fails without a final file', async () => {
  const fixture = await createServer(Buffer.from(''), 'text/plain', 302, {
    Location: 'https://result.kaaf.or.kr/recInfo/topRecList.do',
  });
  const ledgerPath = path.join(tempDir('athletetime-redirect-ledger-'), 'ledger.json');
  const storageRoot = tempDir('athletetime-redirect-files-');

  try {
    const source = createDownloadSource(fixture.url, {}, { ledgerPath });
    const result = await sourceDownload.downloadSource(source.source.sourceId, { ledgerPath, storageRoot });
    const updated = sourceLedger.readSource(source.source.sourceId, { ledgerPath });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SOURCE_DOWNLOAD_BLOCKED');
    assert.equal(updated.downloadStatus, 'failed');
    assert.equal(updated.downloadError, 'SOURCE_DOWNLOAD_BLOCKED');
    assert.equal(fs.existsSync(path.join(storageRoot, source.source.sourceId, 'fixture.xlsx')), false);
  } finally {
    fixture.server.close();
    cleanup(ledgerPath, storageRoot);
  }
});

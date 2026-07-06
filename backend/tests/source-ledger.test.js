const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const sourceInventory = require('../../card-studio/services/sourceInventoryService');
const sourceLedger = require('../../card-studio/services/sourceLedgerService');

function tempLedgerPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-source-ledger-')), 'ledger.json');
}

test('Given missing required source fields When creating source Then typed validation error is returned', () => {
  const result = sourceLedger.createSource(
    { title: 'incomplete source' },
    { ledgerPath: tempLedgerPath(), now: '2026-06-24T00:00:00.000Z' },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'SOURCE_LEDGER_VALIDATION_ERROR');
  assert.ok(result.error.missingFields.includes('sourceUrl'));
  assert.ok(result.error.missingFields.includes('licenseType'));
});

test('Given restricted identifier metadata When creating source Then the source is rejected', () => {
  const result = sourceLedger.createSource(
    {
      provider: '대한육상연맹',
      sourceClass: 'public_official_attachment',
      collectionAction: 'download_file',
      title: 'bad source',
      sourceUrl: 'https://kaaf.or.kr/ver3/info/recordsport.asp?tn=tblRecordSports',
      downloadUrl: 'https://kaaf.or.kr/DATA/recordsport/남자기록최종.xlsx',
      originalFilename: '남자기록최종.xlsx',
      licenseType: 'unknown_kaaf_public_attachment',
      reviewStatus: 'candidate_review',
      extractionMethod: 'official_file_import',
      notes: 'contains person_no in source row',
    },
    { ledgerPath: tempLedgerPath(), now: '2026-06-24T00:00:00.000Z' },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'SOURCE_LEDGER_RESTRICTED_FIELD');
  assert.equal(result.error.field, 'person_no');
});

test('Given a valid inventory candidate When promoted Then ledger persists metadata without raw file body', () => {
  const ledgerPath = tempLedgerPath();
  const batch = sourceInventory.buildSourceInventory({ batch: 'B' });
  const candidate = batch.candidates.find((item) => item.originalFilename === '남자기록최종.xlsx');

  const result = sourceLedger.createSource(candidate, {
    ledgerPath,
    now: '2026-06-24T00:00:00.000Z',
    sha256: 'a'.repeat(64),
    fileSize: 12345,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    licenseType: 'unknown_kaaf_public_attachment',
    extractionMethod: 'official_file_import',
  });

  assert.equal(result.ok, true);
  assert.match(result.source.sourceId, /^SRC-20260624-/);
  assert.equal(result.source.originalFilename, '남자기록최종.xlsx');
  assert.equal(result.source.rawFileBody, undefined);
  assert.equal(result.source.fileBody, undefined);

  const persisted = sourceLedger.listSources({ ledgerPath });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].sourceId, result.source.sourceId);
  assert.equal(persisted[0].downloadUrl.includes('/DATA/recordsport/'), true);
});

test('Given duplicate source URL and filename When promoting twice Then existing source is returned', () => {
  const ledgerPath = tempLedgerPath();
  const candidate = sourceInventory.buildSourceInventory({ batch: 'B' }).candidates[0];
  const options = {
    ledgerPath,
    now: '2026-06-24T00:00:00.000Z',
    sha256: 'b'.repeat(64),
    licenseType: 'unknown_kaaf_public_attachment',
    extractionMethod: 'official_file_import',
  };

  const first = sourceLedger.createSource(candidate, options);
  const second = sourceLedger.createSource(candidate, options);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.created, false);
  assert.equal(sourceLedger.listSources({ ledgerPath }).length, 1);
});

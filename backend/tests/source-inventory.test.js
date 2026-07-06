const assert = require('node:assert/strict');
const test = require('node:test');

const sourceInventory = require('../../card-studio/services/sourceInventoryService');

test('Given a result.kaaf URL When building inventory Then it is blocked without download', () => {
  const inventory = sourceInventory.buildSourceInventory({
    url: 'https://result.kaaf.or.kr/recInfo/topRecList.do',
  });

  assert.equal(inventory.downloaded, 0);
  assert.equal(inventory.candidates.length, 1);
  assert.equal(inventory.candidates[0].collectionAction, 'blocked');
  assert.equal(inventory.candidates[0].blockReason, 'ROBOTS_DISALLOW_ALL');
});

test('Given Batch B When building inventory Then verified KAAF recordsport attachments are queued only', () => {
  const inventory = sourceInventory.buildSourceInventory({ batch: 'B' });

  assert.equal(inventory.downloaded, 0);
  assert.equal(inventory.candidates.length, 7);

  const filenames = inventory.candidates.map((candidate) => candidate.originalFilename);
  assert.ok(filenames.includes('남자기록최종.xlsx'));
  assert.ok(filenames.includes('여자기록최종.xlsx'));
  assert.ok(filenames.includes('종합기록.pdf'));

  for (const candidate of inventory.candidates) {
    assert.equal(candidate.collectionAction, 'download_file');
    assert.equal(candidate.reviewStatus, 'candidate_review');
    assert.equal(candidate.sourceClass, 'public_official_attachment');
    assert.equal(candidate.downloaded, false);
    assert.match(candidate.downloadUrl, /^https:\/\/kaaf\.or\.kr\/DATA\/recordsport\//);
  }
});

test('Given reference batches When building inventory Then reference pages are not file downloads', () => {
  const inventory = sourceInventory.buildSourceInventory({ batch: 'C' });

  assert.equal(inventory.downloaded, 0);
  assert.equal(inventory.candidates.length, 2);
  assert.deepEqual(
    inventory.candidates.map((candidate) => candidate.collectionAction),
    ['fetch_reference_table', 'fetch_reference_table'],
  );
  assert.ok(inventory.candidates.some((candidate) => candidate.sourceUrl.endsWith('/divisional.asp')));
  assert.ok(inventory.candidates.some((candidate) => candidate.sourceUrl.includes('/country.asp')));
});

test('Given Batch A When building inventory Then data.go.kr datasets include IDs and privacy notes', () => {
  const inventory = sourceInventory.buildSourceInventory({ batch: 'A' });

  assert.equal(inventory.downloaded, 0);
  assert.deepEqual(
    inventory.candidates.map((candidate) => candidate.datasetId),
    ['15052695', '15052686', '15052687', '3072953'],
  );

  const participantDataset = inventory.candidates.find((candidate) => candidate.datasetId === '15052686');
  const resultDataset = inventory.candidates.find((candidate) => candidate.datasetId === '15052687');

  assert.equal(participantDataset.collectionAction, 'public_data_import');
  assert.equal(participantDataset.privacyPosture.exposesInternalKeysPublicly, false);
  assert.equal(resultDataset.privacyPosture.exposesInternalKeysPublicly, false);
});

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const dataCandidateBatch = require('../../card-studio/services/dataCandidateBatchService');

const execFileAsync = promisify(execFile);
const rootDir = path.join(__dirname, '..', '..');

function makeTempBatch(name = 'athletetime-candidate-batch-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function writeValidBatch(batchPath, overrides = {}) {
  const sources = overrides.sources ?? [
    {
      sourceId: 'SRC-20260708-0001',
      type: 'kaaf_top_record_manual_check',
      url: 'https://result.kaaf.or.kr/recInfo/topRecList.do',
      title: 'KAAF TOP record manual check',
      checkedAt: '2026-07-08T00:00:00.000Z',
      operator: 'codex-test',
      httpStatus: 200,
      contentHash: null,
      storedOriginalPath: null,
      privacyNotes: 'manual check only; restricted identifiers were not stored',
    },
  ];
  const candidates = overrides.candidates ?? [
    {
      candidateId: 'MRC-20260708-0001',
      status: 'needs_external_confirmation',
      discoveryMethod: 'kaaf_top_record_manual',
      discoveredAt: '2026-07-08T00:00:00.000Z',
      operator: 'codex-test',
      competitionName: '2025 디스턴스첼린지대회(5차)',
      competitionAliases: ['HOKUREN Distance Challenge 2025 in ABASHIRI'],
      date: '2005-07-19',
      event: '800m',
      round: '결승 2',
      place: 2,
      record: '1:46.51',
      athleteDisplayName: '이재웅',
      teamDisplayName: '국군체육부대',
      category: '남자일반부',
      sourceRefs: ['SRC-20260708-0001'],
      restrictedFieldsDropped: ['sourceTopRecordIdentifier', 'sourceAthleteIdentifier', 'birthData', 'rawSourceMarkup'],
      notes: 'external confirmation required before publication',
    },
  ];
  const checklist = overrides.checklist ?? [
    'year,domestic_schedule_url,international_schedule_url,status,private_originals_path,source_ledger_count,candidate_count,reviewer,notes',
    '2005,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2005,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2005,candidate_review_needed,data/sources/import/originals/kaaf-backfill-2005-20260708/2005,1,1,,seed candidate needs review',
    '2006,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2006,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2006,not_started,data/sources/import/originals/kaaf-backfill-2005-20260708/2006,0,0,,',
  ];

  writeJsonl(path.join(batchPath, 'source-ledger.jsonl'), sources);
  writeJsonl(path.join(batchPath, 'candidate-records.jsonl'), candidates);
  fs.writeFileSync(path.join(batchPath, 'year-checklist.csv'), `${checklist.join('\n')}\n`);
}

test('DATA-CANDIDATE-001: Given a sanitized candidate batch When validating Then counts and years are reported', () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath);

    const result = dataCandidateBatch.validateBatch(batchPath, { startYear: 2005, currentYear: 2006 });

    assert.equal(result.ok, true);
    assert.deepEqual(result.counts, { candidates: 1, sources: 1, years: 2 });
    assert.deepEqual(result.years, [2005, 2006]);
    assert.deepEqual(result.errors, []);
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-002: Given a missing source ref When validating Then publication is blocked', () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath, {
      candidates: [
        {
          candidateId: 'MRC-20260708-0002',
          status: 'confirmed',
          discoveryMethod: 'external_official_result',
          discoveredAt: '2026-07-08T00:00:00.000Z',
          operator: 'codex-test',
          competitionName: 'Example',
          competitionAliases: [],
          date: '2025-07-19',
          event: '800m',
          round: null,
          place: 1,
          record: '1:47.00',
          athleteDisplayName: '테스트',
          teamDisplayName: null,
          category: null,
          sourceRefs: ['SRC-MISSING'],
          restrictedFieldsDropped: [],
          notes: '',
        },
      ],
    });

    const result = dataCandidateBatch.validateBatch(batchPath, { startYear: 2005, currentYear: 2006 });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'MISSING_SOURCE_REF' && error.rowIndex === 1));
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-003: Given raw identifiers or session material When validating Then the batch is rejected', () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath, {
      candidates: [
        {
          candidateId: 'MRC-20260708-0003',
          status: 'confirmed',
          discoveryMethod: 'kaaf_athlete_history_manual',
          discoveredAt: '2026-07-08T00:00:00.000Z',
          operator: 'codex-test',
          competitionName: 'Unsafe',
          competitionAliases: [],
          date: '2025-07-19',
          event: '800m',
          round: null,
          place: 1,
          record: '1:47.00',
          athleteDisplayName: '테스트',
          teamDisplayName: null,
          category: null,
          sourceRefs: ['SRC-20260708-0001'],
          restrictedFieldsDropped: ['sourceAthleteIdentifier'],
          notes: 'unsafe',
          person_no: '123456',
        },
      ],
      sources: [
        {
          sourceId: 'SRC-20260708-0001',
          type: 'kaaf_athlete_history_manual_check',
          url: 'https://result.kaaf.or.kr/history/playerHistory.do',
          title: 'Unsafe source',
          checkedAt: '2026-07-08T00:00:00.000Z',
          operator: 'codex-test',
          httpStatus: 200,
          contentHash: null,
          storedOriginalPath: null,
          privacyNotes: 'JSESSIONID=unsafe',
        },
      ],
    });

    const result = dataCandidateBatch.validateBatch(batchPath, { startYear: 2005, currentYear: 2006 });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'RESTRICTED_FIELD_PRESENT' && error.location === 'candidate:1'));
    assert.ok(result.errors.some((error) => error.code === 'SESSION_MATERIAL_PRESENT'));
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-004: Given stale year-checklist counts When validating Then the batch is rejected', () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath, {
      checklist: [
        'year,domestic_schedule_url,international_schedule_url,status,private_originals_path,source_ledger_count,candidate_count,reviewer,notes',
        '2005,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2005,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2005,candidate_review_needed,data/sources/import/originals/kaaf-backfill-2005-20260708/2005,0,0,,stale counts',
        '2006,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2006,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2006,not_started,data/sources/import/originals/kaaf-backfill-2005-20260708/2006,0,0,,',
      ],
    });

    const result = dataCandidateBatch.validateBatch(batchPath, { startYear: 2005, currentYear: 2006 });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'CHECKLIST_CANDIDATE_COUNT_MISMATCH' && error.year === 2005));
    assert.ok(result.errors.some((error) => error.code === 'CHECKLIST_SOURCE_REF_COUNT_MISMATCH' && error.year === 2005));
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-005: Given the real 2005-current batch When CLI validates Then JSON output is safe and successful', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    'tools/validate-data-candidates.js',
    '--batch',
    'docs/data-candidates/batches/2005-current-backfill',
    '--start-year',
    '2005',
    '--current-year',
    '2026',
    '--json',
  ], { cwd: rootDir, encoding: 'utf8' });

  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.counts.years, 22);
  assert.equal(result.counts.candidates, 1);
  assert.equal(JSON.stringify(result).includes('person_no'), false);
  assert.equal(JSON.stringify(result).includes('JSESSIONID'), false);
});

test('DATA-CANDIDATE-006: Given unsafe rejected input When CLI fails Then raw values are not echoed', async () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath, {
      candidates: [
        {
          candidateId: 'MRC-20260708-0006',
          status: 'confirmed',
          discoveryMethod: 'external_official_result',
          discoveredAt: '2026-07-08T00:00:00.000Z',
          operator: 'codex-test',
          competitionName: 'Unsafe echo',
          competitionAliases: [],
          date: '2005-07-19',
          event: '800m',
          round: null,
          place: 1,
          record: '1:47.00',
          athleteDisplayName: '테스트',
          teamDisplayName: null,
          category: null,
          sourceRefs: ['JSESSIONID=unsafe-secret'],
          restrictedFieldsDropped: ['sourceAthleteIdentifier'],
          notes: '',
        },
      ],
    });

    await assert.rejects(
      execFileAsync(process.execPath, [
        'tools/validate-data-candidates.js',
        '--batch',
        batchPath,
        '--start-year',
        '2005',
        '--current-year',
        '2006',
        '--json',
      ], { cwd: rootDir, encoding: 'utf8' }),
      (error) => {
        const result = JSON.parse(error.stdout);
        const serialized = JSON.stringify(result);
        assert.equal(result.ok, false);
        assert.equal(serialized.includes('unsafe-secret'), false);
        assert.equal(serialized.includes('JSESSIONID'), false);
        assert.ok(result.errors.some((item) => item.code === 'MISSING_SOURCE_REF'));
        return true;
      },
    );
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-007: Given malformed source-ledger rows When validating Then source contract violations are rejected', () => {
  const batchPath = makeTempBatch();

  try {
    writeValidBatch(batchPath, {
      sources: [
        {
          sourceId: 'SRC-20260708-0001',
          type: 'not_a_contract_type',
          url: 123,
          title: '',
          checkedAt: 'not-a-date',
          operator: '',
          httpStatus: '200',
          contentHash: 123,
          storedOriginalPath: 456,
          privacyNotes: '',
          extra: 'not allowed',
        },
      ],
    });

    const result = dataCandidateBatch.validateBatch(batchPath, { startYear: 2005, currentYear: 2006 });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'SOURCE_INVALID_TYPE'));
    assert.ok(result.errors.some((error) => error.code === 'SOURCE_INVALID_URL'));
    assert.ok(result.errors.some((error) => error.code === 'SOURCE_INVALID_DATETIME'));
    assert.ok(result.errors.some((error) => error.code === 'SOURCE_ADDITIONAL_PROPERTY'));
  } finally {
    fs.rmSync(batchPath, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-008: Given unsafe batch path When CLI fails Then path is not echoed', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-JSESSIONID=path-secret-'));
  const batchPath = path.join(parent, 'JSESSIONID=leaf-secret');

  try {
    fs.mkdirSync(batchPath);
    writeValidBatch(batchPath, {
      checklist: [
        'year,domestic_schedule_url,international_schedule_url,status,private_originals_path,source_ledger_count,candidate_count,reviewer,notes',
        '2005,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2005,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2005,candidate_review_needed,data/sources/import/originals/kaaf-backfill-2005-20260708/2005,0,0,,stale counts',
        '2006,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2006,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2006,not_started,data/sources/import/originals/kaaf-backfill-2005-20260708/2006,0,0,,',
      ],
    });

    await assert.rejects(
      execFileAsync(process.execPath, [
        'tools/validate-data-candidates.js',
        '--batch',
        batchPath,
        '--start-year',
        '2005',
        '--current-year',
        '2006',
        '--json',
      ], { cwd: rootDir, encoding: 'utf8' }),
      (error) => {
        const result = JSON.parse(error.stdout);
        const serialized = JSON.stringify(result);
        assert.equal(result.ok, false);
        assert.equal(serialized.includes('path-secret'), false);
        assert.equal(serialized.includes('leaf-secret'), false);
        assert.equal(serialized.includes('JSESSIONID'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(result, 'batchPath'), false);
        assert.equal(result.batchName, 'redacted-batch');
        return true;
      },
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('DATA-CANDIDATE-009: Given restricted-looking safe characters in batch name When CLI fails Then name is redacted', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-safe-parent-'));
  const batchPath = path.join(parent, 'sessionId-leaf-secret');

  try {
    fs.mkdirSync(batchPath);
    writeValidBatch(batchPath, {
      checklist: [
        'year,domestic_schedule_url,international_schedule_url,status,private_originals_path,source_ledger_count,candidate_count,reviewer,notes',
        '2005,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2005,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2005,candidate_review_needed,data/sources/import/originals/kaaf-backfill-2005-20260708/2005,0,0,,stale counts',
        '2006,https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=2006,https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=2006,not_started,data/sources/import/originals/kaaf-backfill-2005-20260708/2006,0,0,,',
      ],
    });

    await assert.rejects(
      execFileAsync(process.execPath, [
        'tools/validate-data-candidates.js',
        '--batch',
        batchPath,
        '--start-year',
        '2005',
        '--current-year',
        '2006',
        '--json',
      ], { cwd: rootDir, encoding: 'utf8' }),
      (error) => {
        const result = JSON.parse(error.stdout);
        const serialized = JSON.stringify(result);
        assert.equal(result.ok, false);
        assert.equal(serialized.includes('sessionId'), false);
        assert.equal(serialized.includes('leaf-secret'), false);
        assert.equal(result.batchName, 'redacted-batch');
        return true;
      },
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createRecordWorkspacePreviewService } = require('../../card-studio/services/recordWorkspacePreviewService');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function createWorkspacePreview(rawRecord) {
  const athlete = {
    athleteKey: 'abcdef1234567890',
    name: '가람',
    team: '서울고',
    teams: ['서울고'],
    years: [2026],
    events: ['100m'],
    divisions: ['남자 고등부'],
    records: [rawRecord],
  };
  const athleteByKey = new Map([[athlete.athleteKey, athlete]]);
  const service = createRecordWorkspacePreviewService({ getIndex: () => ({ athleteByKey }) });

  return service.getRecordWorkspacePreview({ subjectKeys: [athlete.athleteKey] });
}

function publicRecordWithRestrictedSourceFields() {
  return {
    id: 'public-record-id',
    athleteKey: 'abcdef1234567890',
    name: '가람',
    team: '서울고',
    season: 2026,
    competitionId: 'competition-2026',
    competitionName: '테스트 대회',
    date: '2026-08-12',
    venue: '테스트 스타디움',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: null,
    rawDivision: '남자 고등부',
    phase: 'final',
    recordDisplay: '10.50',
    recordValue: 10.5,
    direction: 'lower',
    rank: 1,
    wind: null,
    windLegal: true,
    isComparable: true,
    note: '',
    person_no: 'restricted-person-number',
    birthDate: '2008-01-01',
    rawExternalId: 'restricted-external-id',
    source: {
      provider: 'KAAF',
      sourceType: 'public_result',
      sourceLabel: '대한육상연맹 공개 경기결과',
      sourceUrl: 'https://example.test/public-result',
      capturedAt: '2026-08-12T01:02:03.000Z',
      sourceId: 'SRC-INTERNAL-ONLY',
    },
  };
}

test('PUBLIC-PROVENANCE-001 Given a public record with a source receipt When the workspace preview is returned Then it keeps usable provenance and removes internal identifiers', () => {
  // Given a raw index row that has public provenance alongside restricted ingestion fields.
  const preview = createWorkspacePreview(publicRecordWithRestrictedSourceFields());

  // When the public workspace DTO is built.
  const publicSource = preview.records[0].source;

  // Then a visitor can verify the origin without receiving an internal source or identity key.
  assert.deepEqual(publicSource, {
    provider: 'KAAF',
    sourceType: 'public_result',
    sourceLabel: '대한육상연맹 공개 경기결과',
    sourceUrl: 'https://example.test/public-result',
    capturedAt: '2026-08-12T01:02:03.000Z',
  });
  const publicJson = JSON.stringify(preview);
  for (const restrictedValue of [
    'SRC-INTERNAL-ONLY',
    'restricted-person-number',
    '2008-01-01',
    'restricted-external-id',
  ]) {
    assert.equal(publicJson.includes(restrictedValue), false, `public preview must not disclose ${restrictedValue}`);
  }
});

test('CORRECTION-BOUNDARY-001 Given a visitor opens a correction request from a public record When the link is built Then it carries only typed intent and the visible name', () => {
  // Given every public record-detail entry point that constructs a correction link.
  const workspaceTab = readSource('frontend/src/features/record-workspace/pages/WorkspaceRecordTab.tsx');
  const athleteTab = readSource('frontend/src/features/record-workspace/pages/RecordAthleteRecordTab.tsx');
  const requestPage = readSource('frontend/src/pages/DataRequestPage.tsx');
  const receipt = readSource('frontend/src/pages/data-request/DataRequestReceipt.tsx');

  // When the client prepares the correction request and receipt surfaces.
  const correctionFunctions = [workspaceTab, athleteTab]
    .map((source) => source.match(/function correctionHref\([\s\S]*?\r?\n\}\r?\n/u)?.[0] || '');

  // Then no public URL, browser storage action, or receipt takes a record/source identifier forward.
  for (const correctionFunction of correctionFunctions) {
    assert.match(correctionFunction, /type:\s*'correction'/u);
    assert.match(correctionFunction, /athlete:\s*record\.name/u);
    assert.doesNotMatch(correctionFunction, /\b(?:sourceId|recordKey|athleteKey|record\.id)\b/u);
  }
  assert.doesNotMatch(requestPage, /\b(?:sourceId|recordKey|localStorage|sessionStorage)\b/u);
  assert.doesNotMatch(receipt, /\b(?:sourceId|recordKey|athleteName|affiliation|competition|event)\b/u);
  assert.match(receipt, /receipt\.ticketId/u);
});

test('CORRECTION-BOUNDARY-002 Given the browser prepares a public request When its input contract is inspected Then it cannot carry an internal record or source identifier', () => {
  const client = readSource('frontend/src/api/dataRequests.ts');
  const inputContract = client.match(/export interface DataRequestInput \{[\s\S]*?\n\}/u)?.[0] || '';

  assert.match(inputContract, /athleteName: string;/u);
  assert.match(inputContract, /reason: string;/u);
  assert.doesNotMatch(inputContract, /\b(?:recordKey|sourceId)\b/u);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createRecordWorkspacePreviewService } = require('../../card-studio/services/recordWorkspacePreviewService');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');
const recordAnalyticsRoutes = require('../../card-studio/routes/recordAnalyticsRoutes');
const insightService = require('../../card-studio/services/insightService');
const publicRoutes = require('../../card-studio/routes/publicRoutes');
const resultsStore = require('../../card-studio/services/resultsStore');

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

test('PUBLIC-PROVENANCE-001A Given an indexed athlete row with an internal source id When a public athlete summary is built Then the internal id never crosses the profile boundary', () => {
  const indexedAthlete = recordAnalyticsService.getIndex().athletes.find((athlete) => (
    athlete.records.some((record) => record.source?.sourceId)
  ));
  assert.ok(indexedAthlete, 'the indexed fixture must contain a source id to prove the public boundary');

  const profile = recordAnalyticsService.getAthleteSummary(indexedAthlete.athleteKey);
  const profileJson = JSON.stringify(profile);
  assert.ok(profile);
  assert.equal(profileJson.includes('sourceId'), false);
  assert.equal(profileJson.includes('person_no'), false);
  assert.equal(profileJson.includes('birthDate'), false);
  assert.equal(profileJson.includes('rawExternalId'), false);
});

test('PUBLIC-PROVENANCE-001B Given a visitor requests an athlete detail route When it is serialized over HTTP Then restricted provenance fields remain private', async (t) => {
  const indexedAthlete = recordAnalyticsService.getIndex().athletes.find((athlete) => (
    athlete.records.some((record) => record.source?.sourceId)
  ));
  assert.ok(indexedAthlete);

  const app = express();
  app.set('trust proxy', 1);
  app.use(recordAnalyticsRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/athletes/${encodeURIComponent(indexedAthlete.athleteKey)}`,
  );
  const body = await response.json();
  const publicJson = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  for (const field of ['sourceId', 'person_no', 'birthDate', 'birthdate', 'rawExternalId', 'registrationIdentifier']) {
    assert.equal(publicJson.includes(field), false, `public athlete detail must not disclose ${field}`);
  }
});

test('PUBLIC-PROVENANCE-001C Given a visitor opens the legacy athlete detail route When its public insight profile is serialized Then it omits internal source identifiers', async (t) => {
  const profile = insightService.getFeaturedProfiles(1)[0];
  assert.ok(profile, 'the public insight fixture must have a profile');

  const app = express();
  app.set('trust proxy', 1);
  app.use(publicRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/insights/athlete/${encodeURIComponent(profile.id)}`,
  );
  const body = await response.json();
  const publicJson = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(publicJson.includes('sourceId'), false);
  assert.equal(publicJson.includes('person_no'), false);
  assert.equal(publicJson.includes('birthDate'), false);
});

test('PUBLIC-PROVENANCE-001D Given a visitor uses the legacy record search When result provenance is serialized Then it keeps the public receipt without an internal source identifier', async (t) => {
  const profile = insightService.getFeaturedProfiles(1)[0];
  assert.ok(profile, 'the public insight fixture must have a profile');

  const app = express();
  app.set('trust proxy', 1);
  app.use(publicRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/search?q=${encodeURIComponent(profile.name)}&type=name`,
  );
  const body = await response.json();
  const publicJson = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.totalMatches > 0, 'the fixture name must yield a public search result');
  assert.equal(publicJson.includes('sourceId'), false);
  assert.equal(publicJson.includes('person_no'), false);
  assert.equal(publicJson.includes('birthDate'), false);
  assert.equal(publicJson.includes('rawExternalId'), false);
  assert.match(publicJson, /sourceLabel/u);
});

test('PUBLIC-PROVENANCE-001E Given a visitor opens a public competition result When provenance is serialized Then it omits the source file key', async (t) => {
  const filename = resultsStore.listFilenames().find((candidate) => resultsStore.isPublicResultFilename(candidate));
  assert.ok(filename, 'the fixture must have a public result file');

  const app = express();
  app.set('trust proxy', 1);
  app.use(publicRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/results/${encodeURIComponent(filename)}/events`,
  );
  const body = await response.json();
  const publicJson = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.meta.sourceLabel);
  assert.equal(publicJson.includes('sourceId'), false);
  assert.equal(publicJson.includes('person_no'), false);
  assert.equal(publicJson.includes('birthDate'), false);
  assert.equal(publicJson.includes(filename), false);
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

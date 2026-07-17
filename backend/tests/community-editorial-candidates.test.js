const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AI_CANDIDATE_BOUNDARY,
  createCompetitionPreviewFact,
  generateEditorialCandidates,
} = require('../../card-studio/services/editorialCandidateService');

const NOW = '2026-07-17T12:00:00.000Z';

function source(overrides = {}) {
  return {
    ref: 'SRC-20260717-0001',
    provider: '대한육상연맹',
    url: 'https://www.kaaf.or.kr/results/2026.pdf',
    reviewStatus: 'approved',
    sourceClass: 'official',
    ...overrides,
  };
}

function resultFact(overrides = {}) {
  return {
    factId: 'result-2026-100m-final',
    kind: 'competition_result',
    seasonYear: 2026,
    competitionId: 'competition-2026-01',
    sectionKey: 'record-story',
    subjectAgeGroup: 'adult',
    occurredAt: '2026-07-16T09:00:00.000Z',
    whyNow: '대회 결과가 이번 주 공개됐어요.',
    qualityScore: 92,
    factPayload: { event: '100m', phase: 'final', record: '10.23', wind: '+0.8' },
    sourceRefs: [source()],
    relatedLinks: ['/competitions/competition-2026-01', '/records?event=100m'],
    ...overrides,
  };
}

test('EDITORIAL-CANDIDATE-001: a source-backed result becomes a review candidate, never a post', () => {
  const [candidate] = generateEditorialCandidates([resultFact()], { now: NOW });

  assert.equal(candidate.decision, 'ready_for_human_review');
  assert.equal(candidate.approvalEligible, true);
  assert.equal(candidate.packageRole, 'result_context');
  assert.deepEqual(candidate.factPayload, resultFact().factPayload);
  assert.deepEqual(candidate.relatedLinks, resultFact().relatedLinks);
  assert.equal(candidate.autoPublish, false);
  assert.equal(candidate.publicCopy, null);
  assert.match(candidate.fingerprint, /^[a-f0-9]{64}$/u);
});

test('EDITORIAL-CANDIDATE-002: identical facts are blocked for 30 days', () => {
  const original = generateEditorialCandidates([resultFact()], { now: NOW })[0];
  const withinWindow = generateEditorialCandidates([resultFact()], {
    now: NOW,
    existingCandidates: [{ fingerprint: original.fingerprint, createdAt: '2026-06-18T12:00:00.000Z' }],
  })[0];
  const afterWindow = generateEditorialCandidates([resultFact()], {
    now: NOW,
    existingCandidates: [{ fingerprint: original.fingerprint, createdAt: '2026-06-16T11:59:59.000Z' }],
  })[0];

  assert.equal(withinWindow.decision, 'blocked');
  assert.equal(withinWindow.reasons[0].code, 'duplicate_within_30_days');
  assert.equal(afterWindow.decision, 'ready_for_human_review');
});

test('EDITORIAL-CANDIDATE-003: package caps allow one preview, one result, and one record follow-up', () => {
  const facts = [
    resultFact({ factId: 'preview-a', kind: 'competition_preview', factPayload: { event: 'schedule' } }),
    resultFact({ factId: 'preview-b', kind: 'competition_preview', factPayload: { event: 'entries' } }),
    resultFact({ factId: 'result-a' }),
    resultFact({ factId: 'result-b', factPayload: { event: '200m' } }),
    resultFact({ factId: 'story-a', kind: 'record_change' }),
    resultFact({ factId: 'story-b', kind: 'record_change', factPayload: { event: '400m' } }),
  ];
  const candidates = generateEditorialCandidates(facts, { now: NOW });

  assert.deepEqual(
    candidates.map((candidate) => candidate.decision),
    ['ready_for_human_review', 'blocked', 'ready_for_human_review', 'blocked', 'ready_for_human_review', 'blocked'],
  );
  assert.equal(candidates.filter((candidate) => candidate.reasons.some(
    (reason) => reason.code === 'competition_package_cap',
  )).length, 3);
});

test('EDITORIAL-CANDIDATE-003A: review-only candidates still consume the competition package cap', () => {
  const outsideSource = source({ url: 'https://results.example.org/meet/1' });
  const candidates = generateEditorialCandidates([
    resultFact({ factId: 'outside-a', sourceRefs: [outsideSource] }),
    resultFact({
      factId: 'outside-b',
      factPayload: { event: '200m' },
      sourceRefs: [outsideSource],
    }),
  ], { now: NOW });

  assert.equal(candidates[0].decision, 'review_only');
  assert.equal(candidates[1].decision, 'blocked');
  assert.equal(candidates[1].reasons.some((item) => item.code === 'competition_package_cap'), true);
});

test('EDITORIAL-CANDIDATE-004: missing and non-allowlisted sources cannot be approved', () => {
  const [missing, overseas] = generateEditorialCandidates([
    resultFact({ factId: 'missing-source', sourceRefs: [] }),
    resultFact({
      factId: 'overseas-secondary',
      sourceRefs: [source({ provider: 'Unknown blog', url: 'https://news.example/results' })],
    }),
  ], { now: NOW });

  assert.equal(missing.decision, 'blocked');
  assert.equal(missing.reasons[0].code, 'source_ineligible');
  assert.equal(overseas.decision, 'review_only');
  assert.equal(overseas.approvalEligible, false);
  assert.equal(overseas.reasons[0].code, 'source_not_allowlisted');
});

test('EDITORIAL-CANDIDATE-004A: one outside source makes the whole candidate review-only', () => {
  const [candidate] = generateEditorialCandidates([resultFact({
    sourceRefs: [
      source(),
      source({ ref: 'SRC-OUTSIDE', url: 'https://results.example.org/meet/1' }),
    ],
  })], { now: NOW });

  assert.equal(candidate.decision, 'review_only');
  assert.equal(candidate.approvalEligible, false);
  assert.equal(candidate.reasons[0].code, 'source_not_allowlisted');
  assert.equal(candidate.sourceRefs.length, 2);
});

test('EDITORIAL-CANDIDATE-004B: result.kaaf is permanently outside the approval allowlist', () => {
  const [candidate] = generateEditorialCandidates([resultFact({
    sourceRefs: [source({ url: 'https://result.kaaf.or.kr/recInfo/topRecList.do' })],
  })], { now: NOW, allowedSourceHosts: ['result.kaaf.or.kr'] });

  assert.equal(candidate.decision, 'review_only');
  assert.equal(candidate.approvalEligible, false);
  assert.equal(candidate.reasons[0].code, 'source_not_allowlisted');
});

test('EDITORIAL-CANDIDATE-004C: one unapproved source blocks an otherwise eligible source set', () => {
  const [candidate] = generateEditorialCandidates([resultFact({
    sourceRefs: [source(), source({ ref: 'SRC-UNREVIEWED', reviewStatus: 'pending' })],
  })], { now: NOW });

  assert.equal(candidate.decision, 'blocked');
  assert.equal(candidate.approvalEligible, false);
  assert.equal(candidate.reasons[0].code, 'source_ineligible');
});

test('EDITORIAL-CANDIDATE-005: missing why-now and low quality close the slot as skipped', () => {
  const [missingWhy, lowQuality] = generateEditorialCandidates([
    resultFact({ factId: 'missing-why', whyNow: '' }),
    resultFact({ factId: 'low-quality', qualityScore: 59 }),
  ], { now: NOW, minimumQualityScore: 60 });

  assert.deepEqual(
    [missingWhy.reasons[0].code, lowQuality.reasons[0].code],
    ['missing_why_now', 'quality_below_threshold'],
  );
  assert.equal(missingWhy.calendarDisposition, 'skipped');
  assert.equal(lowQuality.calendarDisposition, 'skipped');
});

test('EDITORIAL-CANDIDATE-006: archive facts require a current hook and fingerprints are canonical', () => {
  const first = resultFact({
    factId: 'archive-a', kind: 'archive', archiveContext: null,
    factPayload: { year: 2016, event: '800m' },
  });
  const reordered = resultFact({
    factId: 'archive-a', kind: 'archive', archiveContext: 'anniversary',
    factPayload: { event: '800m', year: 2016 },
  });
  const [blocked] = generateEditorialCandidates([first], { now: NOW });
  const [ready] = generateEditorialCandidates([reordered], { now: NOW });
  const [same] = generateEditorialCandidates([{
    ...reordered, factPayload: { year: 2016, event: '800m' },
  }], { now: NOW });

  assert.equal(blocked.reasons[0].code, 'archive_current_hook_required');
  assert.equal(ready.decision, 'ready_for_human_review');
  assert.equal(ready.fingerprint, same.fingerprint);
});

test('EDITORIAL-CANDIDATE-007: the candidate engine has no AI provider or publication capability', () => {
  assert.deepEqual(AI_CANDIDATE_BOUNDARY, {
    providerConnected: false,
    factAuthority: false,
    autoDraft: false,
    autoPublish: false,
  });
});

test('EDITORIAL-CANDIDATE-008: a stored competition schedule adapts to a fact-only preview', () => {
  const fact = createCompetitionPreviewFact({
    id: '2026-track-field-001',
    name: '2026 여름 육상대회',
    period: { start: '2026-07-24', end: '2026-07-26' },
    venue: '예천',
    category: 'track_field',
  }, {
    whyNow: '대회가 다음 주 시작해요.',
    qualityScore: 88,
    sourceRefs: [source()],
  });
  const [candidate] = generateEditorialCandidates([fact], { now: NOW });

  assert.equal(candidate.kind, 'competition_preview');
  assert.deepEqual(candidate.factPayload, {
    category: 'track_field',
    competitionName: '2026 여름 육상대회',
    endDate: '2026-07-26',
    startDate: '2026-07-24',
    venue: '예천',
  });
  assert.deepEqual(candidate.relatedLinks, ['/competitions?id=2026-track-field-001']);
  assert.equal('content' in candidate, false);
  assert.equal('title' in candidate, false);
});

test('EDITORIAL-CANDIDATE-009: one malformed fact is isolated instead of crashing the batch', () => {
  const [malformed, valid] = generateEditorialCandidates([null, resultFact()], { now: NOW });

  assert.equal(malformed.decision, 'blocked');
  assert.equal(malformed.reasons[0].code, 'invalid_fact');
  assert.equal(valid.decision, 'ready_for_human_review');
});

test('EDITORIAL-CANDIDATE-010: raw articles and restricted identifiers never enter a candidate', () => {
  const [candidate] = generateEditorialCandidates([resultFact({
    factId: 'restricted-payload',
    factPayload: {
      event: '100m',
      rawArticle: 'copied article body',
      athlete: {
        name: '홍길동',
        person_no: 'restricted-source-id',
        PERSON_NO1: 'restricted-uppercase-id',
        email: 'athlete@example.org',
        sessionId: 'restricted-session',
      },
      privateStoragePath: 'C:/private/original.pdf',
    },
  })], { now: NOW });

  assert.equal(candidate.decision, 'blocked');
  assert.equal(candidate.reasons.some((reason) => reason.code === 'restricted_fact_payload'), true);
  assert.deepEqual(candidate.factPayload, { athlete: { name: '홍길동' }, event: '100m' });
  assert.equal(JSON.stringify(candidate).includes('copied article body'), false);
  assert.equal(JSON.stringify(candidate).includes('restricted-source-id'), false);
  assert.equal(JSON.stringify(candidate).includes('restricted-uppercase-id'), false);
  assert.equal(JSON.stringify(candidate).includes('athlete@example.org'), false);
  assert.equal(JSON.stringify(candidate).includes('restricted-session'), false);
  assert.equal(JSON.stringify(candidate).includes('C:/private/original.pdf'), false);
});

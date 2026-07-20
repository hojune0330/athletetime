const {
  candidateFingerprint,
  sanitizeFactPayload,
} = require('./editorialCandidatePayloadPolicy');
const { evaluateCandidateSources } = require('./editorialSourcePolicy');

const AI_CANDIDATE_BOUNDARY = Object.freeze({
  providerConnected: false,
  factAuthority: false,
  autoDraft: false,
  autoPublish: false,
});
const PACKAGE_ROLE_BY_KIND = Object.freeze({
  competition_preview: 'preview',
  competition_result: 'result_context',
  record_change: 'record_story',
  archive: 'record_story',
});
const PACKAGE_LIMITS = Object.freeze({ preview: 1, result_context: 1, record_story: 1 });
const ARCHIVE_HOOKS = Object.freeze(['current_schedule', 'anniversary', 'record_change']);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function reason(code, message) {
  return { code, message };
}

function isRecentDuplicate(fingerprint, candidates, now) {
  return candidates.some((candidate) => {
    if (candidate.fingerprint !== fingerprint) return false;
    const createdAt = Date.parse(candidate.createdAt);
    if (Number.isNaN(createdAt)) return false;
    const age = now.getTime() - createdAt;
    return age >= 0 && age <= THIRTY_DAYS_MS;
  });
}

function safeLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((link) => {
    if (typeof link !== 'string' || link.trim() === '') return false;
    if (/^\/(?!\/)/u.test(link)) return true;
    try {
      return new URL(link).protocol === 'https:';
    } catch {
      return false;
    }
  });
}

function packageCounter(options, competitionId) {
  const configured = options.packageCounts?.[competitionId] || {};
  return {
    preview: Number(configured.preview || 0),
    result_context: Number(configured.result_context || 0),
    record_story: Number(configured.record_story || 0),
  };
}

function evaluateFact(fact, context) {
  if (!fact || typeof fact !== 'object' || Array.isArray(fact)) {
    return {
      reasons: [reason('invalid_fact', '사실 입력 형식을 확인해 주세요.')],
      fingerprint: null,
      packageRole: null,
      qualityScore: Number.NaN,
      sourceResult: { approvalEligible: false, sources: [] },
      factPayload: {},
      whyNow: '',
    };
  }
  const sanitizedPayload = sanitizeFactPayload(fact.factPayload || {});
  const fingerprint = candidateFingerprint({ ...fact, factPayload: sanitizedPayload.value });
  const reasons = [];
  if (sanitizedPayload.restricted) {
    reasons.push(reason('restricted_fact_payload', '후보에 저장할 수 없는 원문 또는 식별 필드를 제거했습니다.'));
  }
  const whyNow = typeof fact.whyNow === 'string' ? fact.whyNow.trim() : '';
  if (!whyNow) reasons.push(reason('missing_why_now', '지금 다룰 이유가 필요합니다.'));
  const qualityScore = Number(fact.qualityScore);
  if (!Number.isFinite(qualityScore) || qualityScore < context.minimumQualityScore) {
    reasons.push(reason('quality_below_threshold', '후보 품질 기준을 충족하지 못했습니다.'));
  }
  if (fact.kind === 'archive' && !ARCHIVE_HOOKS.includes(fact.archiveContext)) {
    reasons.push(reason('archive_current_hook_required', '아카이브 후보는 현재 일정이나 기록 변화와 연결해야 합니다.'));
  }
  if (!PACKAGE_ROLE_BY_KIND[fact.kind]) {
    reasons.push(reason('candidate_kind_not_supported', '지원하지 않는 후보 유형입니다.'));
  }
  const sourceResult = evaluateCandidateSources(fact.sourceRefs, context.sourcePolicy);
  reasons.push(...sourceResult.reasons);
  if (isRecentDuplicate(fingerprint, context.recentCandidates, context.now)) {
    reasons.push(reason('duplicate_within_30_days', '같은 사실 후보가 최근 30일 안에 이미 있습니다.'));
  }
  const packageRole = PACKAGE_ROLE_BY_KIND[fact.kind] || null;
  const counter = context.counters.get(fact.competitionId);
  if (packageRole && counter && counter[packageRole] >= PACKAGE_LIMITS[packageRole]) {
    reasons.push(reason('competition_package_cap', '한 대회의 편집 패키지 상한을 넘었습니다.'));
  }
  return {
    fingerprint, packageRole, qualityScore, reasons, sourceResult,
    factPayload: sanitizedPayload.value, whyNow,
  };
}

function disposition(reasons) {
  const skipCodes = new Set(['missing_why_now', 'quality_below_threshold', 'archive_current_hook_required']);
  return reasons.some((item) => skipCodes.has(item.code)) ? 'skipped' : 'review';
}

function createCompetitionPreviewFact(competition, options = {}) {
  if (!competition || typeof competition !== 'object' || Array.isArray(competition)) {
    throw new TypeError('competition must be an object');
  }
  const competitionId = String(competition.id || '').trim();
  const competitionName = String(competition.name || '').trim();
  const startDate = String(competition.period?.start || '').trim();
  const endDate = String(competition.period?.end || '').trim();
  if (!competitionId || !competitionName || !/^\d{4}-\d{2}-\d{2}$/u.test(startDate)) {
    throw new TypeError('competition id, name, and start date are required');
  }
  return {
    factId: `competition-preview:${competitionId}:${startDate}`,
    kind: 'competition_preview',
    seasonYear: Number(startDate.slice(0, 4)),
    competitionId,
    sectionKey: competition.category === 'road' ? 'road-marathon' : 'competition-preview',
    subjectAgeGroup: 'unknown',
    occurredAt: `${startDate}T00:00:00.000Z`,
    whyNow: options.whyNow,
    qualityScore: options.qualityScore,
    factPayload: {
      competitionName,
      startDate,
      endDate: endDate || startDate,
      venue: String(competition.venue || ''),
      category: String(competition.category || ''),
    },
    sourceRefs: options.sourceRefs || [],
    relatedLinks: [`/competitions?id=${encodeURIComponent(competitionId)}`],
  };
}

function generateEditorialCandidates(facts, options = {}) {
  if (!Array.isArray(facts)) throw new TypeError('facts must be an array');
  const now = new Date(options.now || Date.now());
  if (Number.isNaN(now.getTime())) throw new TypeError('now must be a valid timestamp');
  const context = {
    now,
    minimumQualityScore: Number.isFinite(Number(options.minimumQualityScore))
      ? Number(options.minimumQualityScore)
      : 70,
    recentCandidates: [...(options.existingCandidates || [])],
    counters: new Map(),
    sourcePolicy: { allowedHosts: options.allowedSourceHosts },
  };
  for (const fact of facts) {
    if (fact?.competitionId && !context.counters.has(fact.competitionId)) {
      context.counters.set(fact.competitionId, packageCounter(options, fact.competitionId));
    }
  }

  return facts.map((fact) => {
    const result = evaluateFact(fact, context);
    const onlyReviewReason = result.reasons.length === 1
      && result.reasons[0].code === 'source_not_allowlisted';
    const decision = onlyReviewReason ? 'review_only'
      : result.reasons.length > 0 ? 'blocked' : 'ready_for_human_review';
    if (decision === 'ready_for_human_review' || decision === 'review_only') {
      const counter = context.counters.get(fact.competitionId);
      if (counter && result.packageRole) counter[result.packageRole] += 1;
      context.recentCandidates.push({ fingerprint: result.fingerprint, createdAt: now.toISOString() });
    }
    return {
      candidateId: result.fingerprint ? `candidate-${result.fingerprint.slice(0, 16)}` : null,
      fingerprint: result.fingerprint,
      decision,
      approvalEligible: decision === 'ready_for_human_review' && result.sourceResult.approvalEligible,
      calendarDisposition: disposition(result.reasons),
      kind: fact?.kind || null,
      packageRole: result.packageRole,
      seasonYear: fact?.seasonYear || null,
      competitionId: fact?.competitionId || null,
      sectionKey: fact?.sectionKey || null,
      subjectAgeGroup: fact?.subjectAgeGroup || 'unknown',
      whyNow: result.whyNow || '',
      qualityScore: result.qualityScore,
      factPayload: result.factPayload,
      sourceRefs: result.sourceResult.sources,
      relatedLinks: safeLinks(fact?.relatedLinks),
      reasons: result.reasons,
      createdAt: now.toISOString(),
      requiresHumanApproval: true,
      autoPublish: false,
      publicCopy: null,
    };
  });
}

module.exports = {
  AI_CANDIDATE_BOUNDARY,
  candidateFingerprint,
  createCompetitionPreviewFact,
  generateEditorialCandidates,
};

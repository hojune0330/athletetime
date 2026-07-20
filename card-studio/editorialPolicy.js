const BRAND = '애타 매거진';
const PUBLISHER = '애타 편집팀';
const SECTIONS = Object.freeze(['이번 대회', '기록 이야기', '국제', '로드·마라톤', '실내', '아카이브']);

const PUBLIC_COPY = Object.freeze({
  brand: BRAND,
  publisher: PUBLISHER,
  sourceBasis: '출처 기반',
  humanReview: '운영자가 확인해 정리했어요',
});

const SOURCE_TIERS = Object.freeze([
  Object.freeze({ key: 'A', types: ['primary'], use: 'publishable' }),
  Object.freeze({ key: 'B', types: ['athletetime'], use: 'publishable_with_provenance' }),
  Object.freeze({ key: 'C', types: ['reputable_secondary'], use: 'context_only' }),
  Object.freeze({ key: 'X', types: ['social', 'anonymous', 'ai'], use: 'blocked' }),
]);

const AI_BOUNDARY = Object.freeze({
  internalUses: Object.freeze(['candidate_discovery', 'draft_assistance', 'term_check']),
  providerConnected: false,
  publicAuthorshipAllowed: false,
  humanApprovalRequired: true,
  autoPublish: false,
});

const CORRECTION_PROCEDURE = Object.freeze({
  acknowledgeWithinHours: 24,
  verifyAgainstSources: true,
  publicRevisionRequired: true,
  unpublishOnMaterialRisk: true,
  unpublishPreservesAuditTrail: true,
  hardDeleteAllowed: false,
});

const SEASONAL_FOCUS = Object.freeze({
  winter: Object.freeze(['실내', '로드·마라톤']),
  spring: Object.freeze(['로드·마라톤', '이번 대회']),
  summer: Object.freeze(['이번 대회', '국제', '기록 이야기']),
  autumn: Object.freeze(['이번 대회', '기록 이야기', '아카이브']),
  'off-season': Object.freeze(['아카이브', '기록 이야기']),
  unknown: Object.freeze(['아카이브']),
});

const PUBLISHABLE_SOURCE_TYPES = new Set(['primary', 'athletetime']);
const CONTEXT_SOURCE_TYPES = new Set(['reputable_secondary']);
const ALLOWED_OVERLAYS = new Set(['indoor', 'road-marathon']);
const FORBIDDEN_PUBLIC_TERMS = /공식|공인|인증|검증|랭킹|AI\s*기자|AI\s*검증/iu;
const EVALUATION_TERMS = /평가|등급|우열|하위권|추락|실력|기량/iu;
const PREDICTION_TERMS = /예측|잠재력|기대주|미래\s*기록/iu;
const SENSITIVE_TERMS = /부상|건강|심리|컨디션|통증|회복|질병|우울|부진/iu;
const MINOR_RISK_TERMS = /부진|부상|건강|심리|컨디션|외모|가치|유망주|천재|괴물|순위|잠재력/iu;
const PROMPT_INJECTION_TERMS = /ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|지시를\s*무시|즉시\s*발행/iu;

function reason(code, message) {
  return { code, message };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPublicUrl(value) {
  if (!isNonEmptyString(value)) return false;
  if (/^\/(?!\/)/u.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSources(sources, now) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [reason('source_required', '확인 가능한 출처가 1개 이상 필요합니다.')];
  }

  const reasons = [];
  let publishableCount = 0;
  for (const source of sources) {
    if (!source || !isNonEmptyString(source.provider) || !isNonEmptyString(source.title)
      || !isHttpsUrl(source.url) || !isNonEmptyString(source.accessedAt)) {
      reasons.push(reason('invalid_source', '출처 제공자, 제목, URL, 접근 시각을 확인해 주세요.'));
      continue;
    }

    const accessedAt = new Date(source.accessedAt);
    if (Number.isNaN(accessedAt.getTime())) {
      reasons.push(reason('invalid_source', '출처 접근 시각이 올바르지 않습니다.'));
      continue;
    }
    if (accessedAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      reasons.push(reason('source_accessed_in_future', '출처 접근 시각이 미래일 수 없습니다.'));
    }
    if (now.getTime() - accessedAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
      reasons.push(reason('stale_source', '출처를 최근 시각으로 다시 확인해 주세요.'));
    }

    if (PUBLISHABLE_SOURCE_TYPES.has(source.type)) publishableCount += 1;
    else if (!CONTEXT_SOURCE_TYPES.has(source.type)) {
      reasons.push(reason('source_type_blocked', '허용되지 않은 출처 등급입니다.'));
    }
  }
  if (publishableCount === 0 && !reasons.some((item) => item.code === 'source_type_blocked')) {
    reasons.push(reason('publishable_source_required', '발행 가능한 1차 출처가 필요합니다.'));
  }
  return reasons;
}

function validateCompetitionPackage(value) {
  if (!value) return [];
  const role = value.role;
  if (!['preview', 'result_context', 'record_story'].includes(role)) {
    return [reason('invalid_competition_package_role', '대회 편집 역할을 확인해 주세요.')];
  }
  if (role === 'preview' && Number(value.previewCount || 0) >= 1) {
    return [reason('competition_package_cap', '대회 프리뷰는 1건까지만 발행할 수 있습니다.')];
  }
  if (role === 'result_context' && Number(value.resultContextCount || 0) >= 1) {
    return [reason('competition_package_cap', '결과와 의미 글은 1건까지만 발행할 수 있습니다.')];
  }
  if (role === 'record_story' && value.independentRecordValue !== true) {
    return [reason('independent_record_value_required', '후속 기록 이야기는 독립된 기록 가치가 필요합니다.')];
  }
  if (role === 'record_story' && Number(value.recordStoryCount || 0) >= 1) {
    return [reason('competition_package_cap', '후속 기록 이야기는 1건까지만 발행할 수 있습니다.')];
  }
  return [];
}

function deriveSeasonCadence(input = {}) {
  const competitionCount = Number.isFinite(Number(input.approvedDomesticCompetitionCount))
    ? Math.max(0, Number(input.approvedDomesticCompetitionCount))
    : 0;
  const overlays = Array.isArray(input.overlays)
    ? [...new Set(input.overlays.filter((item) => ALLOWED_OVERLAYS.has(item)))]
    : [];
  if (input.majorWindow === true) {
    return { key: 'major-window', monthlyRange: [8, 12], quotaRequired: false, overlays };
  }
  if (competitionCount >= 2) {
    return { key: 'domestic-season', monthlyRange: [6, 10], quotaRequired: false, overlays };
  }
  return { key: 'off-season', monthlyRange: [3, 5], quotaRequired: false, overlays };
}

function getSeasonalFocus(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: 'unknown', sections: SEASONAL_FOCUS.unknown };
  const month = date.getUTCMonth() + 1;
  let key = 'off-season';
  if (month <= 2) key = 'winter';
  else if (month <= 5) key = 'spring';
  else if (month <= 8) key = 'summer';
  else if (month <= 11) key = 'autumn';
  return { key, sections: SEASONAL_FOCUS[key] };
}

function evaluateEditorialIssue(issue, options = {}) {
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    return { publishEligible: false, decision: 'blocked', reasons: [reason('invalid_issue', '편집 이슈 형식이 올바르지 않습니다.')], autoPublish: false };
  }

  const reasons = [];
  const requiredFields = [
    ['title', 'missing_title'],
    ['summary', 'missing_summary'],
    ['whyNow', 'missing_why_now'],
    ['discussionQuestion', 'missing_discussion_question'],
  ];
  for (const [field, code] of requiredFields) {
    if (!isNonEmptyString(issue[field])) reasons.push(reason(code, `${field} 항목이 필요합니다.`));
  }
  if (!isPublicUrl(issue.relatedUrl)) reasons.push(reason('invalid_related_url', '관련 링크를 확인해 주세요.'));
  if (issue.section && !SECTIONS.includes(issue.section)) reasons.push(reason('invalid_section', '허용된 매거진 섹션이 아닙니다.'));

  const now = new Date(options.now || Date.now());
  reasons.push(...validateSources(issue.sources, Number.isNaN(now.getTime()) ? new Date() : now));
  reasons.push(...validateCompetitionPackage(issue.competitionPackage));

  const publicText = [issue.title, issue.content, issue.summary, issue.whyNow, issue.discussionQuestion]
    .filter((value) => typeof value === 'string')
    .join(' ');
  if (PROMPT_INJECTION_TERMS.test(publicText)) reasons.push(reason('prompt_injection_text', '편집 지시처럼 보이는 문구를 공개 글에 사용할 수 없습니다.'));
  if (FORBIDDEN_PUBLIC_TERMS.test(publicText)) reasons.push(reason('forbidden_public_term', '공개 금칙어가 포함되어 있습니다.'));
  if (EVALUATION_TERMS.test(publicText)) reasons.push(reason('athlete_evaluation', '선수 평가는 발행할 수 없습니다.'));
  if (PREDICTION_TERMS.test(publicText)) reasons.push(reason('athlete_prediction', '선수 또는 기록 예측은 발행할 수 없습니다.'));
  if (SENSITIVE_TERMS.test(publicText)) reasons.push(reason('sensitive_inference', '건강, 부상, 심리 또는 부진 추정은 발행할 수 없습니다.'));
  if (issue.subjectAgeGroup !== 'adult' && MINOR_RISK_TERMS.test(publicText)) {
    reasons.push(reason('minor_sensitive_content', '미성년 관련 평가, 자극 또는 민감 소재는 발행할 수 없습니다.'));
  }
  if (issue.containsArticleExcerpt === true) reasons.push(reason('copyright_risk', '기사 전문 또는 장문 인용은 사용할 수 없습니다.'));
  if (issue.imageRightsConfirmed === false) reasons.push(reason('image_rights_unconfirmed', '이미지 사용권을 확인해 주세요.'));
  if (issue.identityResolved === false) reasons.push(reason('identity_ambiguity', '동명이인 가능성을 먼저 해소해 주세요.'));
  if (issue.aiGeneratedPublicCopy === true) reasons.push(reason('ai_public_copy_blocked', 'AI 결과를 공개 원고로 사용할 수 없습니다.'));

  const publishEligible = reasons.length === 0;
  return {
    publishEligible,
    decision: publishEligible ? 'ready_for_human_review' : 'blocked',
    reasons,
    section: issue.section || '이번 대회',
    publicCopy: PUBLIC_COPY,
    requiresHumanApproval: true,
    autoPublish: false,
  };
}

module.exports = {
  AI_BOUNDARY,
  BRAND,
  CORRECTION_PROCEDURE,
  PUBLIC_COPY,
  PUBLISHER,
  SEASONAL_FOCUS,
  SECTIONS,
  SOURCE_TIERS,
  deriveSeasonCadence,
  evaluateEditorialIssue,
  getSeasonalFocus,
};

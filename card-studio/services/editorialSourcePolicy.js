const { assertSafeSourceUrl } = require('./editorialSourceUrlPolicy');

const DEFAULT_ALLOWED_SOURCE_HOSTS = Object.freeze([
  'www.kaaf.or.kr',
  'kaaf.or.kr',
  'worldathletics.org',
  'www.worldathletics.org',
]);
const PERMANENTLY_BLOCKED_SOURCE_HOSTS = new Set(['result.kaaf.or.kr']);
const ELIGIBLE_SOURCE_CLASSES = Object.freeze([
  'official', 'primary', 'public_record', 'athletetime',
]);

function sourceReason(code, message) {
  return { code, message };
}

function evaluateSource(source, allowedHosts) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { eligible: false, allowlisted: false, source: null };
  }
  if (source.reviewStatus !== 'approved' || !ELIGIBLE_SOURCE_CLASSES.includes(source.sourceClass)) {
    return { eligible: false, allowlisted: false, source: null };
  }
  let normalizedUrl;
  try {
    normalizedUrl = assertSafeSourceUrl(source.url);
  } catch {
    return { eligible: false, allowlisted: false, source: null };
  }
  const hostname = new URL(normalizedUrl).hostname.toLowerCase();
  return {
    eligible: true,
    allowlisted: allowedHosts.has(hostname) && !PERMANENTLY_BLOCKED_SOURCE_HOSTS.has(hostname),
    source: {
      ref: String(source.ref || ''),
      provider: String(source.provider || ''),
      url: normalizedUrl,
      sourceClass: source.sourceClass,
    },
  };
}

function evaluateCandidateSources(sourceRefs, options = {}) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    return {
      approvalEligible: false,
      reviewOnly: false,
      sources: [],
      reasons: [sourceReason('source_ineligible', '승인된 1차 출처가 필요합니다.')],
    };
  }
  const allowedHosts = new Set(options.allowedHosts || DEFAULT_ALLOWED_SOURCE_HOSTS);
  const evaluated = sourceRefs.map((source) => evaluateSource(source, allowedHosts));
  const eligible = evaluated.filter((item) => item.eligible);
  if (eligible.length !== evaluated.length) {
    return {
      approvalEligible: false,
      reviewOnly: false,
      sources: eligible.map((item) => item.source),
      reasons: [sourceReason('source_ineligible', '승인된 1차 출처가 필요합니다.')],
    };
  }
  const allowlisted = eligible.filter((item) => item.allowlisted);
  if (allowlisted.length !== eligible.length) {
    return {
      approvalEligible: false,
      reviewOnly: true,
      sources: eligible.map((item) => item.source),
      reasons: [sourceReason('source_not_allowlisted', '출처 허용 목록 확인이 필요합니다.')],
    };
  }
  return {
    approvalEligible: true,
    reviewOnly: false,
    sources: eligible.map((item) => item.source),
    reasons: [],
  };
}

module.exports = {
  DEFAULT_ALLOWED_SOURCE_HOSTS,
  evaluateCandidateSources,
};

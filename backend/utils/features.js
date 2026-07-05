const FEATURE_LABELS = Object.freeze({
  community: '커뮤니티 기능',
  chat: '실시간 채팅',
  marketplace: '중고거래 기능',
});

const FEATURE_DEFAULTS = Object.freeze({
  community: false,
  chat: false,
  marketplace: false,
});

function parseBooleanFlag(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function envNameFor(feature) {
  return `FEATURE_${feature.toUpperCase()}`;
}

function isFeatureEnabled(feature) {
  return parseBooleanFlag(process.env[envNameFor(feature)], FEATURE_DEFAULTS[feature] === true);
}

function featureComingSoonPayload(feature) {
  const label = FEATURE_LABELS[feature] || '이 기능';

  return {
    success: false,
    code: 'FEATURE_COMING_SOON',
    feature,
    message: `${label}은 오픈 전 점검 중입니다.`,
  };
}

function sendFeatureComingSoon(res, feature) {
  return res.status(503).json(featureComingSoonPayload(feature));
}

function requireFeature(feature) {
  return (req, res, next) => {
    if (isFeatureEnabled(feature)) {
      next();
      return;
    }

    sendFeatureComingSoon(res, feature);
  };
}

module.exports = {
  featureComingSoonPayload,
  isFeatureEnabled,
  requireFeature,
  sendFeatureComingSoon,
};

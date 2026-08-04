/**
 * 운영 환경 PII 디버그 로그 게이트 (P0-F5).
 *
 * 위협:
 *   routes/auth/*.js, routes/posts.js, routes/votes.js 등이
 *     console.log(JSON.stringify(req.body, ...)) 또는
 *     console.log("title=", title, "user.email=", req.user.email) 등을 그대로 출력.
 *   → password, 해시, 이메일, 토큰 등 PII가 운영 서버 stdout에 흘러나감.
 *
 * 대응:
 *   - 운영(NODE_ENV=production) 환경에서 logger.info/debug/error 시
 *     객체 키가 PII 패턴 (password|hash|secret|token|otp|code|email|instagram|...)
 *     으로 추정되면 값을 마스킹해서 출력.
 *   - dev/test 환경에서는 마스킹 없이 그대로 (디버깅 효율).
 *   - 객체가 아닌 string/number 인자 자체는 마스킹하지 않음 (별도 마스킹 책임).
 *
 * 단위 테스트: backend/tests/privacy-guard-logger.test.js
 */

const PII_KEY_RE = /(password|hash|secret|token|credential|otp|^code$|email|phone|mobile|address|instagram|anonymous_?id|cookie|jwt|session|jwtid|authorization)/i;

let IS_PRODUCTION_RUNTIME = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const TRUNCATE_MAX = 400;

function maskString(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  if (value.length <= 4) return '*'.repeat(value.length);
  return value.slice(0, 2) + '*'.repeat(Math.max(2, value.length - 4)) + value.slice(-2);
}

function maskPIIValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return maskString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(maskPIIValue);
  if (typeof value === 'object') return redactObject(value);
  return value;
}

function redactObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Error) return obj; // 에러 객체는 그대로
  if (Array.isArray(obj)) return obj.map((item) => {
    if (typeof item !== 'object' || item === null) return item;
    return redactObject(item);
  });
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEY_RE.test(k)) {
      out[k] = maskPIIValue(v);
    } else if (typeof v === 'object' && v !== null && !(v instanceof Error)) {
      out[k] = redactObject(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function transformArg(arg) {
  if (!IS_PRODUCTION_RUNTIME) return arg;
  if (arg && typeof arg === 'object' && !(arg instanceof Error)) return redactObject(arg);
  return arg;
}

function truncateForLog(s) {
  if (typeof s !== 'string') return s;
  if (s.length <= TRUNCATE_MAX) return s;
  return s.slice(0, TRUNCATE_MAX) + `…(+${s.length - TRUNCATE_MAX})`;
}

const logger = {
  debug: (...args) => console.log('[debug]', ...args.map(transformArg).map(truncateForLog)),
  info: (...args) => console.log('[info]', ...args.map(transformArg).map(truncateForLog)),
  warn: (...args) => console.warn('[warn]', ...args.map(transformArg).map(truncateForLog)),
  error: (...args) => console.error('[error]', ...args.map(transformArg).map(truncateForLog)),
  isProduction: () => IS_PRODUCTION_RUNTIME,
  PII_KEY_RE,
};

module.exports = {
  logger,
  maskString,
  redactObject,
  // public surface only exposes prod detector; forceProductionForTests is for tests
  isProduction: () => IS_PRODUCTION_RUNTIME,
  __forceProductionForTests: (val) => { IS_PRODUCTION_RUNTIME = Boolean(val); },
};

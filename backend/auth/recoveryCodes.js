const crypto = require('crypto');

const CODE_PATTERN = /^\d{6}$/;
const developmentPepper = crypto.randomBytes(32).toString('base64url');

function getRecoveryCodePepper(environment = process.env) {
  const configured = environment.AUTH_CODE_PEPPER;
  if (typeof configured === 'string' && configured.trim().length >= 32) {
    return configured;
  }

  if (environment.NODE_ENV === 'production') {
    throw new Error('AUTH_CODE_PEPPER 환경변수가 설정되지 않았습니다.');
  }

  return developmentPepper;
}

function assertRecoveryCodeEnvironment(environment = process.env) {
  getRecoveryCodePepper(environment);
}

function createRecoveryCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function isRecoveryCode(value) {
  return typeof value === 'string' && CODE_PATTERN.test(value);
}

function hashRecoveryCode(code, environment = process.env) {
  if (!isRecoveryCode(code)) {
    throw new Error('Recovery code must be exactly six digits.');
  }

  return crypto
    .createHmac('sha256', getRecoveryCodePepper(environment))
    .update(code, 'utf8')
    .digest('hex');
}

function recoveryCodeMatches(code, storedHash, environment = process.env) {
  if (!isRecoveryCode(code) || typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }

  const expected = Buffer.from(hashRecoveryCode(code, environment), 'hex');
  const actual = Buffer.from(storedHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = {
  assertRecoveryCodeEnvironment,
  createRecoveryCode,
  hashRecoveryCode,
  isRecoveryCode,
  recoveryCodeMatches,
};

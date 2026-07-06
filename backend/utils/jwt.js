/**
 * JWT 토큰 유틸리티
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * JWT secret 결정 규칙
 * - 운영(production): JWT_SECRET 미설정이면 즉시 서버 기동 실패. 예측 가능한 기본값은 절대 사용하지 않는다.
 * - 개발: 환경변수가 없으면 프로세스마다 무작위 secret을 생성한다(서버 재시작 시 토큰 무효화).
 *   고정된 더미 secret을 코드에 남기지 않아 토큰 위조 위험을 없앤다.
 */
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  if (IS_PRODUCTION) {
    throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다. 운영 환경에서는 반드시 설정해야 합니다.');
  }
  // 개발 전용: 매 기동마다 달라지는 임시 secret (콘솔에 노출하지 않음)
  console.warn('[jwt] JWT_SECRET이 없어 개발용 임시 secret을 생성했습니다. 운영 배포 전 JWT_SECRET을 설정하세요.');
  return crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Access Token 생성
 */
function generateAccessToken(userId, email) {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'access',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Refresh Token 생성
 */
function generateRefreshToken(userId, email) {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'refresh',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * 토큰 검증
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('토큰이 만료되었습니다');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 토큰입니다');
    }
    throw error;
  }
}

/**
 * 토큰 디코드 (검증 없이)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};

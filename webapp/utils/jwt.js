/**
 * JWT 토큰 유틸리티
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
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
      type: 'access'
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
      type: 'refresh'
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

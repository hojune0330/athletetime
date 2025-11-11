/**
 * JWT 인증 미들웨어
 */

const { verifyToken } = require('../utils/jwt');
const db = require('../utils/db');

/**
 * JWT 토큰 검증 미들웨어
 */
async function authenticateToken(req, res, next) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다'
      });
    }

    // 토큰 검증
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: '잘못된 토큰 타입입니다'
      });
    }

    // 사용자 정보 조회
    const userResult = await db.query(
      'SELECT id, email, nickname, username, is_active, is_admin, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = userResult.rows[0];

    // 계정 활성화 체크
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: '비활성화된 계정입니다'
      });
    }

    // 이메일 인증 체크 (선택적)
    // if (!user.email_verified) {
    //   return res.status(403).json({
    //     success: false,
    //     error: '이메일 인증이 필요합니다'
    //   });
    // }

    // 사용자 정보를 req에 추가
    req.user = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      username: user.username,
      isAdmin: user.is_admin,
      emailVerified: user.email_verified
    };

    next();
  } catch (error) {
    console.error('❌ 토큰 검증 실패:', error);
    
    if (error.message === '토큰이 만료되었습니다') {
      return res.status(401).json({
        success: false,
        error: '토큰이 만료되었습니다',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다'
    });
  }
}

/**
 * 관리자 권한 체크 미들웨어
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다'
    });
  }
  next();
}

/**
 * 이메일 인증 체크 미들웨어
 */
function requireEmailVerified(req, res, next) {
  if (!req.user || !req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: '이메일 인증이 필요합니다'
    });
  }
  next();
}

/**
 * 선택적 인증 미들웨어 (로그인하지 않아도 됨)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      req.user = null;
      return next();
    }

    const userResult = await db.query(
      'SELECT id, email, nickname, username, is_active, is_admin, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // 토큰이 유효하지 않아도 계속 진행
    req.user = null;
    next();
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireEmailVerified,
  optionalAuth
};

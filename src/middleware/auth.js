/**
 * 인증/권한 미들웨어
 * 
 * AthleTime 카드 스튜디오의 접근 제어를 담당합니다.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 이식 설계 (athletetime 연동 시)
 * ═══════════════════════════════════════════════════════════════
 * 
 * 현재 (독립 운영 모드):
 *   - 환경변수 ADMIN_TOKEN으로 간단한 Bearer 인증
 *   - 운영자 전용 API만 보호, 공개 API는 제한 없음
 * 
 * athletetime 이식 시:
 *   - authenticateToken + requireAdmin 미들웨어로 교체
 *   - JWT + PostgreSQL 유저 테이블 기반 인증
 *   - 이 파일의 requireAdmin을 athletetime의 것으로 대체하면 됨
 * 
 * 교체 포인트:
 *   module.exports = { requireAuth, requireAdmin, optionalAuth }
 *   → athletetime의 auth/middleware.js에서 가져오기
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * 관리자 인증 미들웨어 (독립 운영 모드)
 * 
 * 인증 방식:
 *   1. Authorization: Bearer <ADMIN_TOKEN> 헤더
 *   2. x-admin-token: <ADMIN_TOKEN> 헤더
 *   3. ?admin_token=<ADMIN_TOKEN> 쿼리 파라미터
 * 
 * ADMIN_TOKEN이 설정되지 않은 경우 (개발 모드):
 *   - NODE_ENV=development이면 통과 (개발 편의)
 *   - NODE_ENV=production이면 모든 관리자 요청 차단
 */
function requireAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  
  // production에서 ADMIN_TOKEN 미설정 시 차단
  if (!adminToken) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: '관리자 인증이 설정되지 않았습니다. ADMIN_TOKEN 환경변수를 설정하세요.',
      });
    }
    // 개발 모드에서는 경고 후 통과
    if (!req._adminAuthWarned) {
      console.warn('⚠️  [보안] ADMIN_TOKEN이 설정되지 않았습니다. 개발 모드에서 관리자 인증을 건너뜁니다.');
      req._adminAuthWarned = true;
    }
    return next();
  }
  
  // 토큰 추출 (3가지 방식)
  let token = null;
  
  // 1) Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  // 2) x-admin-token 헤더
  if (!token && req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }
  
  // 3) 쿼리 파라미터 (편의용, 로그에 남으므로 비권장)
  if (!token && req.query.admin_token) {
    token = req.query.admin_token;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: '관리자 인증이 필요합니다.',
      hint: 'Authorization: Bearer <token> 헤더를 포함하세요.',
    });
  }
  
  // 상수 시간 비교 (타이밍 공격 방지)
  if (!timingSafeEqual(token, adminToken)) {
    return res.status(403).json({
      success: false,
      error: '유효하지 않은 관리자 토큰입니다.',
    });
  }
  
  req.isAdmin = true;
  next();
}

/**
 * 선택적 인증 (로그인 여부와 무관하게 통과, 인증 정보만 첨부)
 * athletetime 이식 시 optionalAuth로 교체
 */
function optionalAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    req.isAdmin = process.env.NODE_ENV !== 'production';
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    req.isAdmin = timingSafeEqual(token, adminToken);
  } else {
    req.isAdmin = false;
  }
  
  next();
}

/**
 * 상수 시간 문자열 비교 (타이밍 공격 방지)
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  const crypto = require('crypto');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf-8'),
      Buffer.from(b, 'utf-8')
    );
  } catch {
    return false;
  }
}

module.exports = { requireAdmin, optionalAuth };

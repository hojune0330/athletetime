/**
 * 보안 헤더 미들웨어
 * 
 * OWASP 권장 보안 헤더를 설정합니다.
 * athletetime 이식 시에도 그대로 사용 가능합니다.
 */

function securityHeaders(req, res, next) {
  // XSS 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 클릭재킹 방지
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Referrer 정책
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 서버 정보 노출 제거
  res.removeHeader('X-Powered-By');
  
  // API 응답에는 캐시 비활성화
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  
  next();
}

module.exports = { securityHeaders };

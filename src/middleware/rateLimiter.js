/**
 * 속도 제한 (Rate Limiter) 미들웨어
 * 
 * 외부 의존성 없이 메모리 기반으로 동작합니다.
 * athletetime 이식 시에도 그대로 사용 가능합니다.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 설계 원칙
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. 공개 API (프로필 카드 검색/생성 등):
 *    - 비로그인: 분당 20회
 *    - 이미지 생성: 분당 5회 (Puppeteer 리소스 보호)
 * 
 * 2. 관리자 API:
 *    - 인증 통과 시 제한 없음
 * 
 * 3. 대량 자동화 수집 방지:
 *    - 검색 API: 분당 30회
 *    - 대회 데이터 API: 분당 60회
 * ═══════════════════════════════════════════════════════════════
 */

// IP별 요청 카운터 저장소
const stores = {};

/**
 * Rate limiter 팩토리
 * @param {Object} options
 * @param {number} options.windowMs - 윈도우 기간 (밀리초, 기본 60000 = 1분)
 * @param {number} options.max - 윈도우 내 최대 요청 수
 * @param {string} options.keyPrefix - 저장소 키 접두사 (엔드포인트별 분리)
 * @param {string} options.message - 제한 초과 시 메시지
 * @param {boolean} options.skipAdmin - 관리자 인증 시 건너뛰기 (기본 true)
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 30,
  keyPrefix = 'global',
  message = '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  skipAdmin = true,
} = {}) {
  // 저장소 초기화
  if (!stores[keyPrefix]) {
    stores[keyPrefix] = new Map();
    
    // 주기적 정리 (메모리 누수 방지, 5분마다)
    setInterval(() => {
      const now = Date.now();
      const store = stores[keyPrefix];
      for (const [key, entry] of store) {
        if (now - entry.windowStart > windowMs * 2) {
          store.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }
  
  return function rateLimiter(req, res, next) {
    // 관리자 인증 시 건너뛰기
    if (skipAdmin && req.isAdmin) {
      return next();
    }
    
    // IP 추출 (프록시 뒤에서도 동작)
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const store = stores[keyPrefix];
    const now = Date.now();
    
    let entry = store.get(key);
    
    if (!entry || now - entry.windowStart > windowMs) {
      // 새 윈도우 시작
      entry = { count: 1, windowStart: now };
      store.set(key, entry);
    } else {
      entry.count++;
    }
    
    // 남은 요청 수 헤더 (클라이언트 친화적)
    const remaining = Math.max(0, max - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);
    
    if (entry.count > max) {
      res.setHeader('Retry-After', resetTime);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: resetTime,
      });
    }
    
    next();
  };
}

// ============================================
// 미리 정의된 제한 설정
// ============================================

/** 공개 검색 API (분당 30회) */
const searchLimiter = createRateLimiter({
  keyPrefix: 'search',
  max: 30,
  message: '검색 요청 한도를 초과했습니다. 1분 후 다시 시도해 주세요.',
});

/** 이미지 생성 API (분당 5회, Puppeteer 보호) */
const generateLimiter = createRateLimiter({
  keyPrefix: 'generate',
  max: 5,
  message: '이미지 생성 한도를 초과했습니다. 1분 후 다시 시도해 주세요.',
});

/** 대회 데이터 API (분당 60회) */
const competitionLimiter = createRateLimiter({
  keyPrefix: 'competition',
  max: 60,
  message: '대회 데이터 요청 한도를 초과했습니다.',
});

/** 일반 공개 API (분당 60회) */
const publicLimiter = createRateLimiter({
  keyPrefix: 'public',
  max: 60,
  message: '요청 한도를 초과했습니다.',
});

module.exports = {
  createRateLimiter,
  searchLimiter,
  generateLimiter,
  competitionLimiter,
  publicLimiter,
};

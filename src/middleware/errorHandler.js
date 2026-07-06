/**
 * 에러 핸들러 미들웨어
 *
 * Express 에러를 일관된 JSON 형식으로 반환합니다.
 */

/**
 * 404 핸들러
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: '요청한 리소스를 찾을 수 없습니다.',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 전역 에러 핸들러
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '서버 내부 오류가 발생했습니다.';

  console.error(`❌ [에러] ${req.method} ${req.originalUrl}: ${message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 요청 로깅 미들웨어
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const icon = status >= 400 ? '⚠️' : '✅';
    console.log(`${icon} [${req.method}] ${req.originalUrl} — ${status} (${duration}ms)`);
  });
  next();
}

module.exports = { notFoundHandler, errorHandler, requestLogger };

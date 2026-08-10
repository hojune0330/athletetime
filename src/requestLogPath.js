function requestLogPath(req) {
  const value = String(req?.originalUrl || `${req?.baseUrl || ''}${req?.path || ''}`)
    .split('?', 1)[0];
  if (/^\/api(?:\/card-studio)?\/data-requests\/[^/]+\/?$/.test(value)) {
    return value.replace(/\/[^/]+\/?$/, '/[redacted]');
  }
  if (/^\/api(?:\/card-studio)?\/analytics\/athletes\/[^/]+\/?$/.test(value)) {
    return value.replace(/\/athletes\/[^/]+\/?$/, '/athletes/[redacted]');
  }
  return value;
}

module.exports = { requestLogPath };

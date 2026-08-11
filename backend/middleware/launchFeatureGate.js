const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PREPARING_MESSAGE = '이 기능은 준비 중이에요.';
const UNAVAILABLE_INTERACTION_PREFIXES = [
  '/api/posts',
  '/api/marketplace',
  '/api/upload',
  '/api/competitions',
  '/api/match-results',
  '/api/reactions',
  '/api/flash-polls',
  '/api/chat',
];

function sendPreparingResponse(res) {
  res.set('Cache-Control', 'no-store').status(503).json({
    success: false,
    error: PREPARING_MESSAGE,
  });
}

function isUnavailableInteractionPath(requestPath) {
  let normalizedPath = requestPath;
  try {
    normalizedPath = decodeURIComponent(requestPath);
  } catch {
    normalizedPath = requestPath;
  }
  normalizedPath = normalizedPath.toLowerCase();
  return UNAVAILABLE_INTERACTION_PREFIXES.some((prefix) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ));
}

function rejectUnavailableInteractionWrite(req, res, next) {
  if (READ_ONLY_METHODS.has(req.method) || !isUnavailableInteractionPath(req.path)) {
    next();
    return;
  }
  rejectPreparingFeature(req, res);
}

function requireReadOnlyLaunchFeature() {
  return (req, res, next) => {
    if (READ_ONLY_METHODS.has(req.method)) {
      next();
      return;
    }
    sendPreparingResponse(res);
  };
}

function rejectPreparingFeature(_req, res) {
  sendPreparingResponse(res);
}

function rejectPreparingWebSocket(socket) {
  socket.write('HTTP/1.1 503 Service Unavailable\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n');
  socket.destroy();
}

module.exports = {
  PREPARING_MESSAGE,
  rejectPreparingFeature,
  rejectUnavailableInteractionWrite,
  rejectPreparingWebSocket,
  requireReadOnlyLaunchFeature,
};

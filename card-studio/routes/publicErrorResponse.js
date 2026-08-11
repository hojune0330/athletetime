const PUBLIC_SERVICE_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

function sendPublicServiceError(res) {
  return res.status(500).set('Cache-Control', 'no-store').json({
    success: false,
    error: PUBLIC_SERVICE_ERROR,
  });
}

module.exports = {
  PUBLIC_SERVICE_ERROR,
  sendPublicServiceError,
};

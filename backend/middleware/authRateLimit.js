function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getRequestIp(req) {
  return typeof req.ip === 'string' && req.ip ? req.ip : '__unknown__';
}

function pruneExpired(entries, now) {
  if (entries.size < 500) return;

  for (const [key, entry] of entries) {
    if (now >= entry.expiresAt) entries.delete(key);
  }
}

function createKeyedRateLimiter({ windowMs, max, message, getKey }) {
  const entries = new Map();

  return (req, res, next) => {
    const now = Date.now();
    pruneExpired(entries, now);
    const key = getKey(req);
    const entry = entries.get(key);
    const active = entry && now < entry.expiresAt ? entry : { count: 0, expiresAt: now + windowMs };
    active.count += 1;
    entries.set(key, active);

    if (active.count > max) {
      const retryAfter = Math.max(1, Math.ceil((active.expiresAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({ success: false, error: message, retryAfter });
      return;
    }

    next();
  };
}

function createEmailRateLimiter(options) {
  return createKeyedRateLimiter({
    ...options,
    getKey: (req) => normalizeEmail(req.body?.email) || '__invalid__',
  });
}

function createIpRateLimiter(options) {
  return createKeyedRateLimiter({
    ...options,
    getKey: getRequestIp,
  });
}

const AUTH_RATE_LIMIT_MESSAGE = '보안을 위해 잠시 후 다시 시도해 주세요.';

const forgotPasswordLimiter = createEmailRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const resetCodeAttemptLimiter = createEmailRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const loginAttemptLimiter = createEmailRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const verificationDeliveryLimiter = createEmailRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const verificationCodeAttemptLimiter = createEmailRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const registrationLimiter = createEmailRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const forgotPasswordIpLimiter = createIpRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const resetCodeAttemptIpLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const loginAttemptIpLimiter = createIpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const verificationDeliveryIpLimiter = createIpRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const verificationCodeAttemptIpLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

const registrationIpLimiter = createIpRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

module.exports = {
  createIpRateLimiter,
  createEmailRateLimiter,
  forgotPasswordLimiter,
  forgotPasswordIpLimiter,
  loginAttemptLimiter,
  loginAttemptIpLimiter,
  registrationLimiter,
  registrationIpLimiter,
  resetCodeAttemptLimiter,
  resetCodeAttemptIpLimiter,
  verificationCodeAttemptIpLimiter,
  verificationCodeAttemptLimiter,
  verificationDeliveryIpLimiter,
  verificationDeliveryLimiter,
};

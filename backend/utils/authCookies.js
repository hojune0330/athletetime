const crypto = require('crypto');

const ACCESS_COOKIE = 'athletetime_access';
const REFRESH_COOKIE = 'athletetime_refresh';
const CSRF_COOKIE = 'athletetime_csrf';
const DAY_SECONDS = 60 * 60 * 24;
const ACCESS_COOKIE_MAX_AGE_SECONDS = DAY_SECONDS * 7;
const REFRESH_COOKIE_MAX_AGE_SECONDS = DAY_SECONDS * 30;
const CSRF_COOKIE_MAX_AGE_SECONDS = REFRESH_COOKIE_MAX_AGE_SECONDS;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length === 0) {
    return {};
  }

  return header.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) {
      return cookies;
    }

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) {
      return cookies;
    }

    cookies[name] = decodeCookieValue(value);
    return cookies;
  }, {});
}

function decodeCookieValue(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) {
      return value;
    }
    throw error;
  }
}

function getCookie(req, name) {
  return parseCookies(req)[name] || null;
}

function appendSetCookie(res, cookie) {
  const current = res.getHeader('Set-Cookie');
  const next = Array.isArray(current)
    ? [...current, cookie]
    : current
      ? [current, cookie]
      : [cookie];
  res.setHeader('Set-Cookie', next);
}

function serializeCookie(name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `SameSite=${options.sameSite || 'Lax'}`,
  ];

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (isProduction() || options.secure) {
    parts.push('Secure');
  }
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  return parts.join('; ');
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function setCsrfCookie(res, token = generateCsrfToken()) {
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
  }));
  return token;
}

function setAuthCookies(res, accessToken, refreshToken) {
  appendSetCookie(res, serializeCookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  }));
  appendSetCookie(res, serializeCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  }));
  setCsrfCookie(res);
}

function clearAuthCookies(res) {
  const expires = new Date(0);
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    appendSetCookie(res, serializeCookie(name, '', {
      httpOnly: name !== CSRF_COOKIE,
      maxAge: 0,
      expires,
    }));
  }
}

function hasAuthCookie(req) {
  return Boolean(getCookie(req, ACCESS_COOKIE) || getCookie(req, REFRESH_COOKIE));
}

function hasBearerAuth(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && Boolean(token);
}

function requireCsrfForCookieAuth(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method) || !hasAuthCookie(req) || hasBearerAuth(req)) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = getCookie(req, CSRF_COOKIE);

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_REQUIRED',
      error: 'CSRF 토큰이 필요합니다',
    });
  }

  return next();
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  clearAuthCookies,
  generateCsrfToken,
  getCookie,
  requireCsrfForCookieAuth,
  setAuthCookies,
  setCsrfCookie,
};

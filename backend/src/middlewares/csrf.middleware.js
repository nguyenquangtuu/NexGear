const crypto = require('crypto');
const env = require('../config/env');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';
const CSRF_BYPASS_PATHS = ['/api/deposits/webhook/sepay', '/api/orders/webhook/sepay', '/api/webhook/sepay', '/api/realtime/pusher/auth', '/api/zalo-bot/webhook'];

/**
 * Manual cookie parser since cookie-parser is not installed
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length < 2) return;
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    list[name] = value;
  });

  return list;
}

const csrfProtection = (req, res, next) => {
  if (CSRF_BYPASS_PATHS.includes(req.path)) {
    return next();
  }

  // 1. Get cookies manually
  const cookies = parseCookies(req.headers.cookie);
  let cookieToken = cookies[CSRF_COOKIE_NAME];
  const sessionToken = req.session?.csrfToken;

  if (!cookieToken && sessionToken) {
    cookieToken = sessionToken;
  }

  // 2. Safe methods: create token if missing
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    const token = cookieToken || sessionToken || crypto.randomBytes(32).toString('hex');
    if (req.session) {
      req.session.csrfToken = token;
    }
    req.csrfToken = token;

    if (!cookieToken || cookieToken !== token) {
      // Set the token in a cookie that Javascript can read
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Essential: frontend needs to read this
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
        domain: env.cookieDomain,
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return next();
  }

  // 3. Mutation requests (POST, PUT, DELETE, PATCH)
  // We check if the token in the header matches the token in the cookie
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.get(CSRF_HEADER_NAME);

  // Validate Origin/Referer for extra protection
  const origin = req.get('origin');
  
  const allowedOrigins = env.frontendOrigin ? env.frontendOrigin.split(',').map(o => o.trim()) : [];
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.some(o => origin === o || origin.startsWith(o))) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid request origin',
    });
  }

  const tokenMatchesCookie = cookieToken && headerToken && cookieToken === headerToken;
  const tokenMatchesSession = sessionToken && headerToken && sessionToken === headerToken;

  if (!tokenMatchesCookie && !tokenMatchesSession) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch or missing. Please refresh the page.',
    });
  }

  next();
};

module.exports = { csrfProtection };

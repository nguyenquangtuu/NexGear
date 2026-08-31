const dotenv = require('dotenv');

dotenv.config();

function deriveCookieDomain(frontendOrigin) {
  try {
    const hostname = new URL(frontendOrigin).hostname;

    if (!hostname || hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return undefined;
    }

    if (hostname.endsWith('.vercel.app')) {
      return undefined;
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`;
    }
  } catch (_error) {
    return undefined;
  }

  return undefined;
}

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const cookieDomain = process.env.COOKIE_DOMAIN || deriveCookieDomain(frontendOrigin);

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin,
  cookieDomain,

  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ai_tools_store',
  },

  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_tools_store_logs',

  session: {
    secret: process.env.SESSION_SECRET || 'please_change_me',
    cookieName: process.env.SESSION_COOKIE_NAME || 'ats.sid',
    ttlMs: Number(process.env.SESSION_TTL_MS || 86400000),
    cookieDomain,
  },

  otp: {
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  },

  passwordReset: {
    expiresMinutes: Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30),
  },

  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  },

  security: {
    bodyLimit: process.env.BODY_LIMIT || '32kb',
    authRateLimit: {
      windowMinutes: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15),
      maxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 600),
    },
    otpRateLimit: {
      windowMinutes: Number(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || 10),
      maxRequests: Number(process.env.OTP_RATE_LIMIT_MAX_REQUESTS || 5),
    },
    login: {
      failedWindowMinutes: Number(process.env.LOGIN_FAILED_WINDOW_MINUTES || 15),
      maxFailedAttempts: Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5),
      lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 30),
    },
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'AI Tools Store <no-reply@example.com>',
    timeoutMs: Number(process.env.SMTP_TIMEOUT_MS || 15000),
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/auth/facebook/callback',
    },
    zalo: {
      appId: process.env.ZALO_APP_ID,
      appSecret: process.env.ZALO_APP_SECRET,
      callbackUrl: process.env.ZALO_CALLBACK_URL || 'http://localhost:5000/api/auth/zalo/callback',
    },
  },
  zaloBot: {
    token: process.env.ZALO_BOT_TOKEN || '',
    webhookSecret: process.env.ZALO_BOT_WEBHOOK_SECRET || '',
    publicLink: process.env.ZALO_BOT_PUBLIC_LINK || '',
    linkCodeExpiresMinutes: Number(process.env.ZALO_BOT_LINK_CODE_EXPIRES_MINUTES || 10),
  },
  sepay: {
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || '',
    returnUrl: process.env.SEPAY_RETURN_URL || `${frontendOrigin.replace(/\/+$/, '')}/payment-result`,
  },
  orders: {
    paymentTimeoutMinutes: Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15),
    timeoutCleanupIntervalMs: Number(process.env.ORDER_TIMEOUT_CLEANUP_INTERVAL_MS || 60000),
  },
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  pusher: {
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
  },
};

module.exports = env;

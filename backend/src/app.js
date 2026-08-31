const express = require('express');
require('events').EventEmitter.defaultMaxListeners = 100;

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const banksRoutes = require('./routes/banks.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const ordersRoutes = require('./routes/orders.routes');
const { receiveSepayWebhook } = require('./controllers/orders.controller');
const { sanitizeRequest } = require('./middlewares/sanitize.middleware');
const { csrfProtection } = require('./middlewares/csrf.middleware');

const path = require('path');
const app = express();

// SePay Webhook - Define BEFORE any global middleware to avoid 415 Unsupported Media Type errors
// from global body parsers or security middlewares.
const sepayDispatcher = async (req, res) => {
  try {
    const payload = { ...(req.body || {}), ...(req.query || {}) };
    req.body = payload; 

    if (req.method === 'GET' && Object.keys(payload).length === 0) {
      return res.json({ success: true, message: 'SePay webhook is active' });
    }

    const content = String(payload.content || '').toUpperCase();
    
    // Deposit flow has been removed; ignore old deposit webhook payloads.
    if (content.includes('VEXTRO')) {
      return res.status(410).json({ success: false, message: 'Tính năng nạp tiền đã bị gỡ bỏ' });
    }
    
    // Default to order handler
    return receiveSepayWebhook(req, res);
  } catch (err) {
    console.error('SePay Dispatcher Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Webhook Middlewares: support both JSON and Form-Urlencoded
const webhookParsers = [
  express.json({ limit: '2mb' }),
  express.urlencoded({ extended: true, limit: '2mb' })
];

// Mount webhook routes early
app.all('/api/webhook/sepay', ...webhookParsers, sepayDispatcher);
app.all('/api/orders/webhook/sepay', ...webhookParsers, receiveSepayWebhook);
app.all('/api/deposits/webhook/sepay', ...webhookParsers, (_req, res) =>
  res.status(410).json({ success: false, message: 'Tính năng nạp tiền đã bị gỡ bỏ' })
);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = env.frontendOrigin ? env.frontendOrigin.split(',').map(o => o.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log CORS rejection for debugging
        console.warn(`CORS rejected origin: ${origin}. Allowed: ${env.frontendOrigin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' })); // Increased limit for base64 uploads
app.use(express.urlencoded({ extended: true }));

app.use(sanitizeRequest);
app.use(csrfProtection);
app.use(morgan('dev'));

// Static files
const uploadsDir = path.join(__dirname, '../public/uploads');
app.use('/api/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));

const authLimiter = rateLimit({
  windowMs: env.security.authRateLimit.windowMinutes * 60 * 1000,
  max: env.security.authRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  },
});

const sessionStore = new MySQLStore({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  charset: 'utf8mb4',
  createDatabaseTable: false,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
});

sessionStore.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Session store error:', err);
});

app.use(
  session({
    name: env.session.cookieName,
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      domain: env.session.cookieDomain,
      maxAge: env.session.ttlMs,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Backend is running' });
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ success: true, token: req.csrfToken || req.session?.csrfToken || null });
});

// Route defined above


app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/banks', banksRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/posts', require('./routes/posts.routes'));
app.use('/api/categories', categoriesRoutes);
app.use('/api/home-banners', require('./routes/home-banners.routes'));
app.use('/api/site-settings', require('./routes/site-settings.routes'));
app.use('/api/orders', ordersRoutes);
app.use('/api/deposits', (_req, res) =>
  res.status(410).json({ success: false, message: 'Tính năng nạp tiền đã bị gỡ bỏ' })
);
app.use('/api/transactions', require('./routes/transactions.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/realtime', require('./routes/realtime.routes'));
app.use('/api/zalo-bot', require('./routes/zalo-bot.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} không tồn tại` });
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
});

module.exports = app;

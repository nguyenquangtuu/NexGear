const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const env = require('../config/env');

const router = express.Router();

const strongPasswordValidator = (fieldName = 'password') =>
  body(fieldName)
    .isLength({ min: 8, max: 100 })
    .withMessage('Mật khẩu phải từ 8-100 ký tự')
    .bail()
    .custom((value) => {
      if (/\s/.test(value)) {
        throw new Error('Mật khẩu không được chứa khoảng trắng');
      }

      const checks = [
        value.length >= 8,
        /[a-z]/.test(value),
        /[A-Z]/.test(value),
        /\d/.test(value),
        /[^A-Za-z0-9]/.test(value),
      ];
      const score = checks.filter(Boolean).length;

      if (score < 4) {
        throw new Error('Mật khẩu chưa đạt mức phù hợp');
      }

      return true;
    });

const otpLimiter = rateLimit({
  windowMs: env.security.otpRateLimit.windowMinutes * 60 * 1000,
  max: env.security.otpRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đăng ký quá nhanh. Vui lòng thử lại sau ít phút.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.',
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau.',
  },
});

const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn thử đặt lại mật khẩu quá nhiều lần. Vui lòng chờ rồi thử lại.',
  },
});

router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Họ tên từ 2-120 ký tự'),
    strongPasswordValidator('password'),
    body('turnstileToken').trim().notEmpty().withMessage('Vui lòng hoàn tất xác minh bảo mật'),
  ],
  authController.register
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('otpCode')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP phải có 6 ký tự'),
  ],
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  otpLimiter,
  [body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail()],
  authController.resendOtp
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
  ],
  authController.login
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('turnstileToken').trim().notEmpty().withMessage('Vui lòng hoàn tất xác minh bảo mật'),
  ],
  authController.requestPasswordReset
);

router.post(
  '/reset-password',
  passwordResetConfirmLimiter,
  [
    body('token').trim().notEmpty().withMessage('Thiếu mã đặt lại mật khẩu'),
    strongPasswordValidator('newPassword'),
    body('turnstileToken').trim().notEmpty().withMessage('Vui lòng hoàn tất xác minh bảo mật'),
  ],
  authController.resetPassword
);

router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.put(
  '/profile',
  requireAuth,
  [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Họ tên từ 2-120 ký tự'),
  ],
  authController.updateProfile
);
router.get('/social-accounts', requireAuth, authController.getSocialAccounts);
router.post('/unlink-social', requireAuth, authController.unlinkSocialAccount);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  (req, _res, next) => {
    req.authProvider = 'google';
    next();
  },
  passport.authenticate('google', { failureRedirect: `${env.frontendOrigin}/login?error=google_failed` }),
  authController.socialCallback
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get(
  '/facebook/callback',
  (req, _res, next) => {
    req.authProvider = 'facebook';
    next();
  },
  passport.authenticate('facebook', { failureRedirect: `${env.frontendOrigin}/login?error=facebook_failed` }),
  authController.socialCallback
);

router.get('/zalo', authController.zaloRedirect);
router.get('/zalo/callback', authController.zaloCallback);

router.post(
  '/complete-email/request-otp',
  requireAuth,
  [body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail()],
  authController.requestCompleteEmailOtp
);
router.post(
  '/complete-email/verify',
  requireAuth,
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('otpCode')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP phải có 6 ký tự'),
  ],
  authController.verifyCompleteEmailOtp
);

router.post('/token-login', authController.tokenLogin);
router.post(
  '/change-password',
  requireAuth,
  [strongPasswordValidator('newPassword')],
  authController.changePassword
);

router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post(
  '/2fa/enable',
  requireAuth,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số')],
  authController.enable2FA
);
router.post(
  '/2fa/disable',
  requireAuth,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số')],
  authController.disable2FA
);
router.post(
  '/2fa/verify-login',
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số')],
  authController.verify2FALogin
);

module.exports = router;

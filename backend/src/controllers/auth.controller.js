const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const pool = require('../config/mysql');
const env = require('../config/env');

const googleClient = new OAuth2Client(env.oauth.google.clientId);
const { handleSocialLogin } = require('../services/social-auth.service');
const { generateOtpCode } = require('../utils/otp');
const {
  sendOtpEmail,
  sendPasswordResetEmail,
  getEmailErrorMessage,
  getEmailErrorDetails,
} = require('../services/email.service');
const { writeLog, logActivity, createNotification } = require('../services/log.service');
const {
  ensureNotLocked,
  recordFailedLogin,
  clearLoginAttempts,
} = require('../services/login-throttle.service');
const { verifyTurnstileToken } = require('../services/turnstile.service');

function validationError(res, req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

function buildEmailFailurePayload(error) {
  const details = getEmailErrorDetails(error);

  return {
    emailStatus: 'failed',
    errorCode: details.code,
    errorMessage: getEmailErrorMessage(error),
    debug: {
      response: details.response,
      command: details.command,
      rejected: details.rejected,
    },
  };
}

async function register(req, res) {
  if (validationError(res, req)) return;

  const turnstileResult = await verifyTurnstileToken(
    req.body.turnstileToken,
    req.ip || req.socket?.remoteAddress || '',
    'register'
  );
  if (!turnstileResult.ok) {
    return res.status(400).json({ success: false, message: turnstileResult.message });
  }

  const { email, fullName, password } = req.body;

  const conn = await pool.getConnection();
  let transactionCommitted = false;
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id, is_email_verified FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length) {
      await conn.rollback();
      const existingUser = existing[0];
      return res.status(409).json({
        success: false,
        code: existingUser.is_email_verified ? 'EMAIL_ALREADY_REGISTERED' : 'EMAIL_NOT_VERIFIED',
        message: existingUser.is_email_verified
          ? 'Email đã được đăng ký'
          : 'Email này đã được đăng ký nhưng chưa xác thực. Vui lòng nhập OTP để kích hoạt tài khoản.',
        data: {
          email,
          canVerifyOtp: !existingUser.is_email_verified,
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let depositCode;
    let isUnique = false;
    while (!isUnique) {
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      depositCode = 'VEXTRO' + randomStr;
      const [existingCode] = await conn.query('SELECT id FROM users WHERE deposit_code = ?', [depositCode]);
      if (!existingCode.length) isUnique = true;
    }

    const [insertResult] = await conn.query(
      'INSERT INTO users (email, full_name, password_hash, deposit_code) VALUES (?, ?, ?, ?)',
      [email, fullName, passwordHash, depositCode]
    );

    const userId = insertResult.insertId;
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

    await conn.query(
      'INSERT INTO email_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    await conn.commit();
    transactionCommitted = true;
    let otpEmailSent = true;
    let otpEmailErrorMessage = '';
    let otpEmailMeta = null;
    let otpEmailFailure = null;
    try {
      otpEmailMeta = await sendOtpEmail(email, otpCode);
    } catch (mailError) {
      otpEmailSent = false;
      otpEmailErrorMessage = getEmailErrorMessage(mailError);
      otpEmailFailure = buildEmailFailurePayload(mailError);
      await writeLog({
        level: 'error',
        action: 'REGISTER_SEND_OTP_FAILED',
        message: mailError.message,
        meta: { userId, email, ...otpEmailFailure },
      });
    }

    await logActivity({
      action: 'REGISTER',
      user_id: userId,
      email,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      description: otpEmailSent ? 'User registered and OTP sent' : 'User registered but OTP email failed',
      meta: {
        userId,
        email,
        otpEmailSent,
        emailMessageId: otpEmailMeta?.messageId || null,
        emailResponse: otpEmailMeta?.response || otpEmailFailure?.debug?.response || null,
        emailErrorCode: otpEmailFailure?.errorCode || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: otpEmailSent
        ? 'Vui lòng kiểm tra email để lấy mã OTP.'
        : 'Đã tạo tài khoản nhưng gửi OTP thất bại. Vui lòng thử lại sau.',
      data: {
        userId,
        email,
        otpEmailSent,
        emailStatus: otpEmailSent ? 'sent' : 'failed',
        emailMessageId: otpEmailMeta?.messageId || null,
        emailResponse: otpEmailMeta?.response || otpEmailFailure?.debug?.response || null,
        emailErrorCode: otpEmailFailure?.errorCode || null,
      },
    });
  } catch (error) {
    if (!transactionCommitted) {
      await conn.rollback();
    }

    await writeLog({
      level: 'error',
      action: 'REGISTER_FAILED',
      message: error.message,
      meta: { email },
    });

    return res.status(500).json({
      success: false,
      message: 'Đăng ký thất bại',
    });
  } finally {
    conn.release();
  }
}

async function verifyOtp(req, res) {
  if (validationError(res, req)) return;

  const { email, otpCode } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [users] = await conn.query(
      'SELECT id, email, full_name, role, is_email_verified, deposit_code, balance FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!users.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: '\u004b\u0068\u00f4\u006e\u0067 \u0074\u00ec\u006d \u0074\u0068\u1ea5\u0079 \u0074\u00e0\u0069 \u006b\u0068\u006f\u1ea3\u006e' });
    }

    const user = users[0];

    if (user.is_email_verified) {
      await conn.rollback();
      return res.status(200).json({
        success: true,
        message: 'Email đã xác thực trước đó',
      });
    }

    const [otpRows] = await conn.query(
      `SELECT id, expires_at, is_used
       FROM email_otps
       WHERE user_id = ? AND otp_code = ?
       ORDER BY id DESC
       LIMIT 1`,
      [user.id, otpCode]
    );

    if (!otpRows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ' });
    }

    const otp = otpRows[0];
    const expired = new Date(otp.expires_at).getTime() < Date.now();

    if (otp.is_used || expired) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: expired ? 'OTP đã hết hạn' : 'OTP đã được sử dụng',
      });
    }

    await conn.query('UPDATE email_otps SET is_used = 1 WHERE id = ?', [otp.id]);
    await conn.query('UPDATE users SET is_email_verified = 1 WHERE id = ?', [user.id]);

    await conn.commit();

    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      depositCode: user.deposit_code,
      balance: user.balance,
      createdAt: user.created_at,
    };

    await logActivity({
      action: 'VERIFY_OTP',
      user_id: user.id,
      email: user.email,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      description: 'Email verified and auto-logged in successfully',
      meta: { userId: user.id, email },
    });

    return res.json({
      success: true,
      message: 'Xác thực email thành công. Bạn đã được đăng nhập tự động.',
      data: req.session.user,
    });
  } catch (error) {
    await conn.rollback();
    await writeLog({
      level: 'error',
      action: 'VERIFY_OTP_FAILED',
      message: error.message,
      meta: { email },
    });

    return res.status(500).json({
      success: false,
      message: 'Xác thực OTP thất bại',
    });
  } finally {
    conn.release();
  }
}

async function resendOtp(req, res) {
  if (validationError(res, req)) return;

  const { email } = req.body;

  try {
    const [users] = await pool.query(
      'SELECT id, is_email_verified FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const user = users[0];

    if (user.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã xác thực, không cần gửi OTP',
      });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

    await pool.query('INSERT INTO email_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)', [
      user.id,
      otpCode,
      expiresAt,
    ]);

    const emailMeta = await sendOtpEmail(email, otpCode);
    await writeLog({
      action: 'RESEND_OTP',
      message: 'OTP resent',
      meta: { userId: user.id, email, emailStatus: 'sent', emailMessageId: emailMeta.messageId, emailResponse: emailMeta.response },
    });

    return res.json({
      success: true,
      message: 'Đã gửi lại OTP qua email',
      data: {
        emailStatus: 'sent',
        emailMessageId: emailMeta.messageId,
        emailResponse: emailMeta.response,
      },
    });
  } catch (error) {
    const emailFailure = buildEmailFailurePayload(error);
    await writeLog({
      level: 'error',
      action: 'RESEND_OTP_FAILED',
      message: error.message,
      meta: { email, ...emailFailure },
    });
    return res.status(500).json({ success: false, message: emailFailure.errorMessage, data: emailFailure });
  }
}

async function login(req, res) {
  if (validationError(res, req)) return;

  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

  try {
    const lockStatus = await ensureNotLocked(email, ipAddress);
    if (lockStatus.locked) {
      res.set('Retry-After', String(lockStatus.retryAfterSeconds || 60));
      return res.status(429).json({
        success: false,
        message: `Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${lockStatus.retryAfterSeconds || 60} giây.`,
      });
    }

    const [users] = await pool.query(
      'SELECT id, email, full_name, role, password_hash, is_email_verified, deposit_code, balance, created_at, is_2fa_enabled, two_factor_secret, is_blocked, block_reason FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!users.length) {
      await recordFailedLogin(email, ipAddress);
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await recordFailedLogin(email, ipAddress);
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email chưa xác thực. Vui lòng xác thực OTP trước khi đăng nhập.',
        data: {
          email: user.email,
          canVerifyOtp: true,
        },
      });
    }
    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        message: user.block_reason || 'Tài khoản của bạn đã bị khóa truy cập hệ thống.',
      });
    }

    await clearLoginAttempts(email, ipAddress);

    // Kiểm tra bảo mật 2 lớp
    if (user.is_2fa_enabled) {
      req.session.pending2FAUserId = user.id;
      return res.json({
        success: true,
        require2FA: true,
        message: 'Vui lòng nhập mã bảo mật 2 lớp'
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      depositCode: user.deposit_code,
      balance: user.balance,
    };

    await logActivity({
      action: 'LOGIN',
      user_id: user.id,
      email: user.email,
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'],
      description: 'User logged in',
      meta: { userId: user.id, email: user.email, ipAddress },
    });

    // Create notification for login
    createNotification({
      user_id: user.id,
      email: user.email,
      type: 'LOGIN_SUCCESS',
      title: 'Đăng nhập thành công',
      message: `Tài khoản của bạn vừa được đăng nhập từ IP: ${ipAddress}`,
      data: { ipAddress, userAgent: req.headers['user-agent'] }
    }).catch(err => console.error('Failed to create login notification:', err.message));

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: req.session.user,
    });
  } catch (error) {
    await writeLog({
      level: 'error',
      action: 'LOGIN_FAILED',
      message: error.message,
      meta: { email, ipAddress },
    });
    return res.status(500).json({ success: false, message: 'Đăng nhập thất bại' });
  }
}

async function requestPasswordReset(req, res) {
  if (validationError(res, req)) return;

  const turnstileResult = await verifyTurnstileToken(
    req.body.turnstileToken,
    req.ip || req.socket?.remoteAddress || '',
    'password-reset-request'
  );
  if (!turnstileResult.ok) {
    return res.status(400).json({ success: false, message: turnstileResult.message });
  }

  const { email } = req.body;

  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, is_blocked FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length && !users[0].is_blocked) {
      const user = users[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + env.passwordReset.expiresMinutes * 60 * 1000);
      const resetUrl = `${env.frontendOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;

      await pool.query('UPDATE password_reset_tokens SET is_used = 1, used_at = NOW() WHERE user_id = ? AND is_used = 0', [user.id]);
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, tokenHash, expiresAt]
      );

      const emailMeta = await sendPasswordResetEmail(user.email, resetUrl);
      await writeLog({
        action: 'PASSWORD_RESET_REQUEST',
        message: 'Password reset email sent',
        meta: {
          userId: user.id,
          email: user.email,
          emailStatus: 'sent',
          emailMessageId: emailMeta.messageId,
          emailResponse: emailMeta.response,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
    });
  } catch (error) {
    const emailFailure = buildEmailFailurePayload(error);
    await writeLog({
      level: 'error',
      action: 'PASSWORD_RESET_REQUEST_FAILED',
      message: error.message,
      meta: { email, ...emailFailure },
    });
    return res.status(500).json({
      success: false,
      message: emailFailure.errorMessage,
      data: emailFailure,
    });
  }
}

async function resetPassword(req, res) {
  if (validationError(res, req)) return;

  const turnstileResult = await verifyTurnstileToken(
    req.body.turnstileToken,
    req.ip || req.socket?.remoteAddress || '',
    'password-reset-confirm'
  );
  if (!turnstileResult.ok) {
    return res.status(400).json({ success: false, message: turnstileResult.message });
  }

  const { token, newPassword } = req.body;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.is_used, u.email
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ?
       ORDER BY prt.id DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Liên kết đặt lại mật khẩu không hợp lệ.' });
    }

    const resetToken = rows[0];
    if (resetToken.is_used || new Date(resetToken.expires_at).getTime() < Date.now()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetToken.user_id]);
    await conn.query('UPDATE password_reset_tokens SET is_used = 1, used_at = NOW() WHERE id = ?', [resetToken.id]);
    await conn.query('UPDATE password_reset_tokens SET is_used = 1, used_at = NOW() WHERE user_id = ? AND id <> ? AND is_used = 0', [resetToken.user_id, resetToken.id]);

    await conn.commit();

    await writeLog({
      action: 'PASSWORD_RESET_SUCCESS',
      message: 'Password reset completed',
      meta: { userId: resetToken.user_id, email: resetToken.email },
    });

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (error) {
    await conn.rollback();
    await writeLog({
      level: 'error',
      action: 'PASSWORD_RESET_FAILED',
      message: error.message,
      meta: { tokenHash },
    });
    return res.status(500).json({
      success: false,
      message: 'Không thể đặt lại mật khẩu.',
    });
  } finally {
    conn.release();
  }
}

async function logout(req, res) {
  const sessionUser = req.session?.user;

  req.session.destroy(async (error) => {
    if (error) {
      await writeLog({
        level: 'error',
        action: 'LOGOUT_FAILED',
        message: error.message,
        meta: { userId: sessionUser?.id },
      });

      return res.status(500).json({ success: false, message: 'Đăng xuất thất bại' });
    }

    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'ats.sid');

    await writeLog({
      action: 'LOGOUT',
      message: 'User logged out',
      meta: { userId: sessionUser?.id },
    });

    return res.json({ success: true, message: 'Đăng xuất thành công' });
  });
}

async function me(req, res) {
  const sessionUser = req.session.user || req.user;

  if (!sessionUser) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, role, deposit_code, balance, created_at, is_2fa_enabled FROM users WHERE id = ? LIMIT 1',
      [sessionUser.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const user = users[0];
    const email = user.email || '';
    const needsEmail =
      email.endsWith('@zalo.local') ||
      email.endsWith('@social.local') ||
      email.endsWith('@zalo.social') ||
      email.includes('@zalo.') ||
      email.includes('@social.');

    const userData = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      depositCode: user.deposit_code,
      balance: user.balance,
      role: user.role,
      needsEmail,
      createdAt: user.created_at,
      is_2fa_enabled: !!user.is_2fa_enabled,
    };

    // Update session with latest data
    req.session.user = userData;

    return res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}

async function updateProfile(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  const fullName = String(req.body.fullName || '').trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    return res.status(400).json({ success: false, message: 'Họ tên phải từ 2-120 ký tự' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, role, deposit_code, balance, created_at, is_2fa_enabled FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [fullName, userId]);

    const existingUser = users[0];
    const email = existingUser.email || '';
    const needsEmail =
      email.endsWith('@zalo.local') ||
      email.endsWith('@social.local') ||
      email.endsWith('@zalo.social') ||
      email.includes('@zalo.') ||
      email.includes('@social.');

    const userData = {
      id: existingUser.id,
      email,
      fullName,
      depositCode: existingUser.deposit_code,
      balance: existingUser.balance,
      role: existingUser.role,
      needsEmail,
      createdAt: existingUser.created_at,
      is_2fa_enabled: !!existingUser.is_2fa_enabled,
    };

    req.session.user = {
      ...(req.session.user || {}),
      ...userData,
    };

    await logActivity({
      action: 'UPDATE_PROFILE',
      user_id: userId,
      email: existingUser.email,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      description: 'User updated profile name',
      meta: { userId, fullName },
    });

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: userData,
    });
  } catch (error) {
    await writeLog({
      level: 'error',
      action: 'UPDATE_PROFILE_FAILED',
      message: error.message,
      meta: { userId },
    });
    return res.status(500).json({ success: false, message: 'Không thể cập nhật thông tin' });
  }
}

async function socialCallback(req, res) {
  // Passport has already authenticated the user and stored in req.user
  if (!req.user) {
    return res.redirect(`${env.frontendOrigin}/login?error=auth_failed`);
  }

  req.session.user = {
    id: req.user.id,
    email: req.user.email,
    fullName: req.user.full_name,
    role: req.user.role,
    depositCode: req.user.deposit_code,
    balance: req.user.balance,
    createdAt: req.user.created_at,
  };

  await writeLog({
    action: 'SOCIAL_LOGIN',
    message: 'User logged in via social account',
    meta: { userId: req.user.id, email: req.user.email },
  });

  const provider = req.authProvider || 'social';
  return res.redirect(
    `${env.frontendOrigin}/login?social_popup=1&provider=${encodeURIComponent(provider)}&success=1`
  );
}

function toBase64Url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256Base64Url(input) {
  const hash = crypto.createHash('sha256').update(input, 'ascii').digest();
  return toBase64Url(hash);
}

async function zaloRedirect(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = toBase64Url(crypto.randomBytes(32));
  const codeChallenge = sha256Base64Url(codeVerifier);

  req.session.zaloOauthState = state;
  req.session.zaloCodeVerifier = codeVerifier;

  const url =
    `https://oauth.zaloapp.com/v4/permission` +
    `?app_id=${encodeURIComponent(env.oauth.zalo.appId)}` +
    `&redirect_uri=${encodeURIComponent(env.oauth.zalo.callbackUrl)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  return res.redirect(url);
}

async function zaloCallback(req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const error = req.query.error;

  if (error) {
    return res.redirect(`${env.frontendOrigin}/login?error=zalo_failed`);
  }

  if (!code || !state || state !== req.session.zaloOauthState) {
    return res.redirect(`${env.frontendOrigin}/login?error=zalo_invalid_state`);
  }

  try {
    const body = new URLSearchParams({
      app_id: String(env.oauth.zalo.appId),
      code: String(code),
      grant_type: 'authorization_code',
      code_verifier: String(req.session.zaloCodeVerifier || ''),
    });

    const tokenRes = await axios.post('https://oauth.zaloapp.com/v4/access_token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: env.oauth.zalo.appSecret,
      },
    });

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.redirect(`${env.frontendOrigin}/login?error=zalo_missing_token`);
    }

    const meRes = await axios.get('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
      headers: { access_token: accessToken },
    });

    const me = meRes.data || {};
    const profile = {
      id: me.id,
      displayName: me.name,
    };

    const user = await handleSocialLogin(profile, 'zalo');

    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      depositCode: user.deposit_code,
      balance: user.balance,
    };

    await writeLog({
      action: 'SOCIAL_LOGIN',
      message: 'User logged in via social account',
      meta: { userId: user.id, email: user.email, provider: 'zalo' },
    });

    return res.redirect(`${env.frontendOrigin}/login?social_popup=1&provider=zalo&success=1`);
  } catch (e) {
    await writeLog({
      level: 'error',
      action: 'ZALO_OAUTH_FAILED',
      message: e.message,
    });
    return res.redirect(`${env.frontendOrigin}/login?error=zalo_failed`);
  } finally {
    delete req.session.zaloOauthState;
    delete req.session.zaloCodeVerifier;
  }
}

async function requestCompleteEmailOtp(req, res) {
  if (validationError(res, req)) return;

  const userId = req.session.user?.id || req.user?.id;
  const { email } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [
      email,
      userId,
    ]);

    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

    await pool.query(
      'INSERT INTO email_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    const emailMeta = await sendOtpEmail(email, otpCode);
    await writeLog({
      action: 'COMPLETE_EMAIL_REQUEST_OTP',
      message: 'OTP sent for completing email',
      meta: { userId, email, emailStatus: 'sent', emailMessageId: emailMeta.messageId, emailResponse: emailMeta.response },
    });

    return res.json({
      success: true,
      message: 'Đã gửi OTP đến email',
      data: {
        emailStatus: 'sent',
        emailMessageId: emailMeta.messageId,
        emailResponse: emailMeta.response,
      },
    });
  } catch (error) {
    const emailFailure = buildEmailFailurePayload(error);
    await writeLog({
      level: 'error',
      action: 'COMPLETE_EMAIL_REQUEST_OTP_FAILED',
      message: error.message,
      meta: { userId, email, ...emailFailure },
    });
    return res.status(500).json({ success: false, message: emailFailure.errorMessage, data: emailFailure });
  }
}

async function verifyCompleteEmailOtp(req, res) {
  if (validationError(res, req)) return;

  const userId = req.session.user?.id || req.user?.id;
  const { email, otpCode } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [
      email,
      userId,
    ]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const [otpRows] = await conn.query(
      `SELECT id, expires_at, is_used
       FROM email_otps
       WHERE user_id = ? AND otp_code = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId, otpCode]
    );

    if (!otpRows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ' });
    }

    const otp = otpRows[0];
    const expired = new Date(otp.expires_at).getTime() < Date.now();
    if (otp.is_used || expired) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: expired ? 'OTP đã hết hạn' : 'OTP đã được sử dụng',
      });
    }

    await conn.query('UPDATE email_otps SET is_used = 1 WHERE id = ?', [otp.id]);
    await conn.query('UPDATE users SET email = ?, is_email_verified = 1 WHERE id = ?', [email, userId]);

    const [users] = await conn.query('SELECT id, email, full_name, role, deposit_code FROM users WHERE id = ? LIMIT 1', [
      userId,
    ]);
    await conn.commit();

    const user = users[0];
    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      depositCode: user.deposit_code,
    };

    await writeLog({
      action: 'COMPLETE_EMAIL_VERIFY_OTP',
      message: 'Email completed successfully',
      meta: { userId, email },
    });

    return res.json({ success: true, message: 'Xác thực email thành công', data: req.session.user });
  } catch (error) {
    await conn.rollback();
    await writeLog({
      level: 'error',
      action: 'COMPLETE_EMAIL_VERIFY_OTP_FAILED',
      message: error.message,
      meta: { userId, email },
    });
    return res.status(500).json({ success: false, message: 'Xác thực OTP thất bại' });
  } finally {
    conn.release();
  }
}

async function tokenLogin(req, res) {
  const { provider, accessToken } = req.body;

  if (!provider || !accessToken) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin provider hoặc accessToken' });
  }

  try {
    let profile;
    if (provider === 'google') {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: accessToken,
          audience: env.oauth.google.clientId,
        });
        const payload = ticket.getPayload();
        profile = {
          id: payload.sub,
          emails: [{ value: payload.email }],
          displayName: payload.name,
        };
      } catch (e) {
        const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
        profile = {
          id: response.data.sub,
          emails: [{ value: response.data.email }],
          displayName: response.data.name,
        };
      }
    } else if (provider === 'facebook') {
      const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
      profile = {
        id: response.data.id,
        emails: response.data.email ? [{ value: response.data.email }] : [],
        displayName: response.data.name,
      };
    } else if (provider === 'zalo') {
      const response = await axios.get('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
        headers: { access_token: accessToken }
      });
      profile = {
        id: response.data.id,
        displayName: response.data.name,
      };
    } else {
      return res.status(400).json({ success: false, message: 'Provider không được hỗ trợ' });
    }

    const user = await handleSocialLogin(profile, provider);

    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      depositCode: user.deposit_code,
    };

    await writeLog({
      action: 'TOKEN_LOGIN',
      message: `User logged in via ${provider} token`,
      meta: { userId: user.id, email: user.email, provider },
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: req.session.user,
    });
  } catch (error) {
    await writeLog({
      level: 'error',
      action: 'TOKEN_LOGIN_FAILED',
      message: error.message,
      meta: { provider },
    });
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

async function changePassword(req, res) {
  if (validationError(res, req)) return;

  const userId = req.session.user?.id || req.user?.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const user = users[0];

    // If user has a password, verify the current one
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    await writeLog({
      action: 'CHANGE_PASSWORD',
      message: 'User changed password',
      meta: { userId },
    });

    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Đổi mật khẩu thất bại' });
  }
}

async function getSocialAccounts(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  try {
    const [accounts] = await pool.query(
      'SELECT provider, email FROM user_social_accounts WHERE user_id = ?',
      [userId]
    );
    return res.json({ success: true, data: accounts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể lấy thông tin liên kết' });
  }
}

async function unlinkSocialAccount(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  const { provider } = req.body;

  if (!provider) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin provider' });
  }

  try {
    const [user] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    const [socials] = await pool.query('SELECT id FROM user_social_accounts WHERE user_id = ?', [userId]);

    if (!user[0].password_hash && socials.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Bạn phải đặt mật khẩu hoặc liên kết tài khoản khác trước khi hủy liên kết cuối cùng',
      });
    }

    await pool.query(
      'DELETE FROM user_social_accounts WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    return res.json({ success: true, message: 'Hủy liên kết thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể hủy liên kết' });
  }
}

async function setup2FA(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  const userEmail = req.session.user?.email || req.user?.email;

  try {
    const [users] = await pool.query('SELECT is_2fa_enabled FROM users WHERE id = ?', [userId]);
    if (users[0].is_2fa_enabled) {
      return res.status(400).json({ success: false, message: '2FA đã được bật' });
    }

    const { generateSecret, getOtpauthUrl } = require('../services/twoFactor.service');
    const secret = generateSecret();
    const otpauthUrl = getOtpauthUrl(userEmail, secret);

    // Lưu vào session tạm thời để verify sau
    req.session.temp2FASecret = secret;

    return res.json({
      success: true,
      data: {
        secret,
        otpauthUrl,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi thiết lập 2FA' });
  }
}

async function enable2FA(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  const { code } = req.body;
  const secret = req.session.temp2FASecret;

  if (!secret) {
    return res.status(400).json({ success: false, message: 'Phiên thiết lập đã hết hạn' });
  }

  const { verifyTOTP, generateTOTP } = require('../services/twoFactor.service');
  if (verifyTOTP(code, secret)) {
    try {
      await pool.query('UPDATE users SET two_factor_secret = ?, is_2fa_enabled = 1 WHERE id = ?', [secret, userId]);
      delete req.session.temp2FASecret;
      
      // Update session user
      if (req.session.user) req.session.user.is2faEnabled = true;

      return res.json({ success: true, message: 'Bật 2FA thành công' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi lưu 2FA' });
    }
  } else {
    return res.status(400).json({ success: false, message: 'Mã xác thực không đúng' });
  }
}

async function disable2FA(req, res) {
  const userId = req.session.user?.id || req.user?.id;
  const { code } = req.body;

  try {
    const [users] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    const secret = users[0].two_factor_secret;

    if (!secret) {
      return res.status(400).json({ success: false, message: '2FA chưa được bật' });
    }

    const { verifyTOTP } = require('../services/twoFactor.service');
    if (verifyTOTP(code, secret)) {
      await pool.query('UPDATE users SET two_factor_secret = NULL, is_2fa_enabled = 0 WHERE id = ?', [userId]);
      
      if (req.session.user) req.session.user.is2faEnabled = false;

      return res.json({ success: true, message: 'Tắt 2FA thành công' });
    } else {
      return res.status(400).json({ success: false, message: 'Mã xác thực không đúng' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tắt 2FA' });
  }
}

async function verify2FALogin(req, res) {
  const { code } = req.body;
  const userId = req.session.pending2FAUserId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = users[0];

    const { verifyTOTP, generateTOTP } = require('../services/twoFactor.service');
    if (verifyTOTP(code, user.two_factor_secret)) {
      delete req.session.pending2FAUserId;

      req.session.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        depositCode: user.deposit_code,
        balance: user.balance,
        createdAt: user.created_at,
        is2faEnabled: true,
      };

      await writeLog({
        action: 'LOGIN_2FA',
        message: 'User logged in via 2FA',
        meta: { userId: user.id, email: user.email },
      });

      return res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: req.session.user,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Mã xác thực không đúng' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xác thực 2FA' });
  }
}

module.exports = {
  requestPasswordReset,
  register,
  resetPassword,
  verifyOtp,
  resendOtp,
  login,
  logout,
  me,
  updateProfile,
  socialCallback,
  zaloRedirect,
  zaloCallback,
  requestCompleteEmailOtp,
  verifyCompleteEmailOtp,
  tokenLogin,
  getSocialAccounts,
  unlinkSocialAccount,
  changePassword,
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FALogin,
};

/**
 * @file email.service.js
 * @description Email notification service utilizing Nodemailer with SMTP transport.
 * Provides transactional email capabilities including OTP verification, password resets,
 * and administrative broadcast announcements.
 *
 * Implements connection caching, timeout guards, and standardized error handling.
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

const DEFAULT_SMTP_TIMEOUT_MS = 15000;
const smtpTimeoutMs = Number(env.smtp.timeoutMs || DEFAULT_SMTP_TIMEOUT_MS);
const BRAND_LOGO_URL = `${env.frontendOrigin.replace(/\/+$/, '')}/images/brand/logo-dark.png`;

const transportOptions = {
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  connectionTimeout: smtpTimeoutMs,
  greetingTimeout: smtpTimeoutMs,
  socketTimeout: smtpTimeoutMs,
};

if (env.smtp.user) {
  transportOptions.auth = {
    user: env.smtp.user,
    pass: env.smtp.pass,
  };
}

const transporter = nodemailer.createTransport(transportOptions);

let smtpVerificationCache = {
  checkedAt: 0,
  ok: false,
};

/**
 * Wraps a promise with an execution timeout guard.
 *
 * @template T
 * @param {Promise<T>} promise - The target promise to monitor.
 * @param {number} timeoutMs - Timeout threshold in milliseconds.
 * @param {Function} errorFactory - Factory callback returning the error to reject with on timeout.
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, errorFactory) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(errorFactory());
      }, timeoutMs);

      promise.finally(() => clearTimeout(timer)).catch(() => {});
    }),
  ]);
}

/**
 * Helper to construct an Error instance with a domain-specific error code and metadata.
 *
 * @param {string} message - Human-readable error description.
 * @param {string} code - Domain error identifier (e.g., 'EMAIL_TIMEOUT', 'SMTP_AUTH_MISSING').
 * @param {object} [meta={}] - Additional context attributes.
 * @returns {Error}
 */
function createEmailError(message, code, meta = {}) {
  const error = new Error(message);
  error.code = code;
  error.meta = meta;
  return error;
}

/**
 * Builds a standardized mailto URI for the List-Unsubscribe header.
 *
 * @param {string} to - Recipient email address.
 * @returns {string} Mailto unsubscribe link.
 */
function getUnsubscribeAddress(to) {
  const senderAddress = env.smtp.user || 'no-reply@nexgear.vn';
  const subject = encodeURIComponent(`unsubscribe:${String(to || '').trim()}`);
  return `mailto:${senderAddress}?subject=${subject}`;
}

/**
 * Wraps dynamic HTML content inside the NexGear responsive branding email layout.
 *
 * @param {object} options - Layout configuration.
 * @param {string} options.bodyHtml - Primary HTML body content.
 * @returns {string} Fully styled HTML email string.
 */
function buildEmailLayout({ bodyHtml }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px;">
      <div style="margin-bottom: 24px;">
        <img
          src="${BRAND_LOGO_URL}"
          alt="NexGear"
          style="max-width: 120px; height: auto; display: block;"
        />
      </div>
      <div style="font-size: 15px;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

/**
 * Escapes unsafe HTML characters to prevent XSS in email bodies.
 *
 * @param {string} value - Raw string to escape.
 * @returns {string} Escaped string.
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Masks an email address for privacy-safe logging and response representations.
 *
 * @param {string} email - Raw email address (e.g. "user@example.com").
 * @returns {string} Masked representation (e.g. "u**r@example.com").
 */
function maskEmailAddress(email) {
  if (!email || !String(email).includes('@')) return '';
  const [local, domain] = String(email).split('@');
  if (!local || !domain) return '';
  const visible = local.length <= 2 ? local[0] : `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

/**
 * Validates that all necessary SMTP transport configurations exist in environment variables.
 *
 * @returns {Error|null} Returns an Error object if configuration is deficient, or null if valid.
 */
function getTransportConfigError() {
  if (!env.smtp.host || !env.smtp.port) {
    return createEmailError('SMTP host or port is missing', 'SMTP_CONFIG_MISSING');
  }

  if (!env.smtp.user || !env.smtp.pass) {
    return createEmailError('SMTP username or password is missing', 'SMTP_AUTH_MISSING');
  }

  return null;
}

/**
 * Verifies SMTP connectivity with caching to prevent redundant socket handshakes.
 *
 * @param {boolean} [force=false] - When true, bypasses the 5-minute verification cache.
 * @returns {Promise<{ok: boolean, cached: boolean}>}
 */
async function verifySmtpConnection(force = false) {
  const configError = getTransportConfigError();
  if (configError) {
    throw configError;
  }

  const now = Date.now();
  if (!force && smtpVerificationCache.ok && now - smtpVerificationCache.checkedAt < 5 * 60 * 1000) {
    return { ok: true, cached: true };
  }

  await withTimeout(
    transporter.verify(),
    smtpTimeoutMs,
    () => createEmailError(`SMTP verification timed out after ${smtpTimeoutMs}ms`, 'EMAIL_TIMEOUT')
  );

  smtpVerificationCache = {
    checkedAt: now,
    ok: true,
  };

  return { ok: true, cached: false };
}

/**
 * Dispatches an email via configured SMTP transporter with validation and timeout management.
 *
 * @param {object} options - Mail dispatch options.
 * @param {string} options.to - Destination email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} options.html - Pre-rendered HTML content.
 * @returns {Promise<{accepted: string[], rejected: string[], pending: string[], response: string, messageId: string, envelope: object, maskedTo: string}>}
 * @throws {Error} Throws domain error if configuration is invalid, connection fails, or delivery is rejected.
 */
async function sendEmail({ to, subject, html }) {
  const configError = getTransportConfigError();
  if (configError) {
    throw configError;
  }

  await verifySmtpConnection();

  const info = await withTimeout(
    transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${getUnsubscribeAddress(to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
    smtpTimeoutMs,
    () => createEmailError(`Email send timed out after ${smtpTimeoutMs}ms`, 'EMAIL_TIMEOUT', { to })
  );

  if (!Array.isArray(info.accepted) || info.accepted.length === 0) {
    throw createEmailError('SMTP did not accept the recipient', 'EMAIL_NOT_ACCEPTED', {
      to,
      rejected: info.rejected || [],
      response: info.response || '',
    });
  }

  return {
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    pending: info.pending || [],
    response: info.response || '',
    messageId: info.messageId || '',
    envelope: info.envelope || {},
    maskedTo: maskEmailAddress(to),
  };
}

/**
 * Sends a registration OTP verification code to a newly registered user.
 *
 * @param {string} toEmail - Recipient email.
 * @param {string} otpCode - One-time numeric passcode.
 * @returns {Promise<object>} Dispatch result from sendEmail.
 */
async function sendOtpEmail(toEmail, otpCode) {
  const html = buildEmailLayout({
    bodyHtml: `
      <h2>Xác thực email đăng ký</h2>
      <p>Mã OTP của bạn là:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otpCode}</p>
      <p>Mã có hiệu lực trong ${env.otp.expiresMinutes} phút.</p>
      <p>Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
    `,
  });

  return sendEmail({
    to: toEmail,
    subject: 'Mã OTP xác thực đăng ký tài khoản',
    html,
  });
}

/**
 * Sends a password reset link to a user requesting account recovery.
 *
 * @param {string} toEmail - Recipient email.
 * @param {string} resetUrl - Complete HTTPS reset URL containing secure token.
 * @returns {Promise<object>} Dispatch result from sendEmail.
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const html = buildEmailLayout({
    bodyHtml: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 12px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;"
        >
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Liên kết này có hiệu lực trong ${env.passwordReset.expiresMinutes} phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    `,
  });

  return sendEmail({
    to: toEmail,
    subject: 'Yêu cầu đặt lại mật khẩu',
    html,
  });
}

/**
 * Sends an administrative announcement or marketing broadcast email.
 *
 * @param {object} params - Broadcast parameters.
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.subject - Email subject.
 * @param {string} params.content - Safe HTML body content.
 * @param {string} [params.heading] - Optional title heading in email header.
 * @returns {Promise<object>} Dispatch result.
 */
async function sendAdminBroadcastEmail({ toEmail, subject, content, heading }) {
  const safeHeading = escapeHtml(heading || subject || 'Thông báo từ NexGear');

  const html = buildEmailLayout({
    bodyHtml: `
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0;">${safeHeading}</h2>
      <div style="font-size: 15px; color: #334155; line-height: 1.6;">${content}</div>
    `,
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
  });
}

/**
 * Translates low-level SMTP errors and connection exceptions into user-friendly Vietnamese messages.
 *
 * @param {Error|object} error - The caught exception.
 * @returns {string} Localized error message suitable for frontend display.
 */
function getEmailErrorMessage(error) {
  const rawMessage = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  if (code === 'EMAIL_TIMEOUT' || rawMessage.includes('timed out') || rawMessage.includes('timeout')) {
    return 'Kết nối tới máy chủ email bị timeout. Vui lòng thử lại sau hoặc kiểm tra cấu hình SMTP.';
  }

  if (code === 'SMTP_CONFIG_MISSING' || code === 'SMTP_AUTH_MISSING') {
    return 'Cấu hình email của hệ thống chưa đầy đủ. Vui lòng liên hệ quản trị viên.';
  }

  if (rawMessage.includes('550-5.4.5') || rawMessage.includes('daily user sending limit exceeded')) {
    return 'Hệ thống email đã vượt giới hạn gửi trong ngày. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
  }

  if (
    rawMessage.includes('invalid login') ||
    rawMessage.includes('authentication') ||
    rawMessage.includes('badcredentials') ||
    code === 'EAUTH'
  ) {
    return 'Cấu hình email của hệ thống đang gặp lỗi xác thực. Vui lòng kiểm tra lại tài khoản SMTP.';
  }

  if (code === 'EMAIL_NOT_ACCEPTED') {
    return 'Máy chủ email không chấp nhận người nhận. Vui lòng kiểm tra lại địa chỉ email.';
  }

  if (rawMessage.includes('econnrefused') || rawMessage.includes('enotfound') || rawMessage.includes('ehostunreach')) {
    return 'Không thể kết nối tới máy chủ SMTP. Vui lòng kiểm tra host, port hoặc firewall.';
  }

  return 'Không thể gửi email lúc này. Vui lòng thử lại sau.';
}

/**
 * Extracts structured metadata from an email dispatch failure for diagnostic logging.
 *
 * @param {Error|object} error - Caught exception.
 * @returns {{code: string, message: string, response: string, command: string, rejected: string[]}}
 */
function getEmailErrorDetails(error) {
  return {
    code: String(error?.code || 'EMAIL_SEND_FAILED'),
    message: String(error?.message || 'Unknown email error'),
    response: String(error?.response || error?.meta?.response || ''),
    command: String(error?.command || ''),
    rejected: Array.isArray(error?.rejected) ? error.rejected : Array.isArray(error?.meta?.rejected) ? error.meta.rejected : [],
  };
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendAdminBroadcastEmail,
  verifySmtpConnection,
  getEmailErrorMessage,
  getEmailErrorDetails,
};

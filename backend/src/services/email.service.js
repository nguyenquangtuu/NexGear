const nodemailer = require('nodemailer');
const env = require('../config/env');

const DEFAULT_SMTP_TIMEOUT_MS = 15000;
const smtpTimeoutMs = Number(env.smtp.timeoutMs || DEFAULT_SMTP_TIMEOUT_MS);
const BRAND_LOGO_URL = `${env.frontendOrigin.replace(/\/+$/, '')}/images/brand/logo-dark.png`;

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  connectionTimeout: smtpTimeoutMs,
  greetingTimeout: smtpTimeoutMs,
  socketTimeout: smtpTimeoutMs,
});

let smtpVerificationCache = {
  checkedAt: 0,
  ok: false,
};

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

function createEmailError(message, code, meta = {}) {
  const error = new Error(message);
  error.code = code;
  error.meta = meta;
  return error;
}

function getUnsubscribeAddress(to) {
  const senderAddress = env.smtp.user || 'no-reply@nexgear.vn';
  const subject = encodeURIComponent(`unsubscribe:${String(to || '').trim()}`);
  return `mailto:${senderAddress}?subject=${subject}`;
}

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskEmailAddress(email) {
  if (!email || !String(email).includes('@')) return '';
  const [local, domain] = String(email).split('@');
  if (!local || !domain) return '';
  const visible = local.length <= 2 ? local[0] : `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

function getTransportConfigError() {
  if (!env.smtp.host || !env.smtp.port) {
    return createEmailError('SMTP host or port is missing', 'SMTP_CONFIG_MISSING');
  }

  if (!env.smtp.user || !env.smtp.pass) {
    return createEmailError('SMTP username or password is missing', 'SMTP_AUTH_MISSING');
  }

  return null;
}

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

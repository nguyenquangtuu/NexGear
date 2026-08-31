const axios = require('axios');
const env = require('../config/env');

async function verifyTurnstileToken(token, remoteIp, expectedAction) {
  const responseToken = String(token || '').trim();

  if (!responseToken) {
    return {
      ok: false,
      message: 'Vui lòng xác nhận Turnstile.',
    };
  }

  if (!env.turnstile.secretKey) {
    return {
      ok: false,
      message: 'Turnstile chưa được cấu hình ở máy chủ.',
    };
  }

  try {
    const body = new URLSearchParams({
      secret: env.turnstile.secretKey,
      response: responseToken,
    });

    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const { data } = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (!data?.success) {
      return {
        ok: false,
        message: 'Xác minh Turnstile thất bại. Vui lòng thử lại.',
      };
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      return {
        ok: false,
        message: 'Yêu cầu Turnstile không hợp lệ.',
      };
    }

    return { ok: true };
  } catch (_error) {
    return {
      ok: false,
      message: 'Không thể xác minh Turnstile. Vui lòng thử lại.',
    };
  }
}

module.exports = {
  verifyTurnstileToken,
};

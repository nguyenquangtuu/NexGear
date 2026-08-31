const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/mysql');
const env = require('../config/env');
const { triggerUserEvent } = require('./pusher.service');

const LINK_CODE_PREFIX = 'VXZ';

function isZaloBotConfigured() {
  return Boolean(env.zaloBot.token && env.zaloBot.webhookSecret);
}

function getLinkCodeExpiresAt() {
  return new Date(Date.now() + env.zaloBot.linkCodeExpiresMinutes * 60 * 1000);
}

function buildBotApiUrl(functionName) {
  return `https://bot-api.zaloplatforms.com/bot${env.zaloBot.token}/${functionName}`;
}

function generateLinkCode() {
  return `${LINK_CODE_PREFIX}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function extractLinkCode(text) {
  const matched = String(text || '').toUpperCase().match(/VXZ-[A-Z0-9]{6}/);
  return matched ? matched[0] : null;
}

async function sendZaloBotMessage(chatId, text) {
  if (!isZaloBotConfigured() || !chatId || !text) {
    return { ok: false, skipped: true };
  }

  try {
    const response = await axios.post(buildBotApiUrl('sendMessage'), {
      chat_id: String(chatId),
      text: String(text).slice(0, 2000),
    });

    if (!response.data?.ok) {
      const errorData = response.data || { ok: false, description: 'Unknown Zalo Bot error' };
      console.error('Failed to send Zalo Bot message:', errorData);
      return { ok: false, error: errorData };
    }

    return response.data;
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error('Failed to send Zalo Bot message:', errorData);
    return { ok: false, error: errorData };
  }
}

function maskChatId(chatId) {
  if (!chatId) return null;
  const value = String(chatId);
  if (value.length <= 6) return value;
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

async function getZaloBotStatus(userId) {
  const [rows] = await pool.query(
    `SELECT zalo_bot_chat_id, zalo_bot_chat_name, zalo_bot_notifications_enabled,
            zalo_bot_link_code, zalo_bot_link_code_expires_at, zalo_bot_linked_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = rows[0] || {};
  const now = Date.now();
  const codeExpiresAt = user.zalo_bot_link_code_expires_at ? new Date(user.zalo_bot_link_code_expires_at) : null;
  const hasPendingCode = Boolean(user.zalo_bot_link_code && codeExpiresAt && codeExpiresAt.getTime() > now);

  return {
    configured: isZaloBotConfigured(),
    botLink: env.zaloBot.publicLink || null,
    linked: Boolean(user.zalo_bot_chat_id),
    enabled: Boolean(user.zalo_bot_notifications_enabled),
    chatIdMasked: maskChatId(user.zalo_bot_chat_id),
    chatName: user.zalo_bot_chat_name || null,
    linkedAt: user.zalo_bot_linked_at || null,
    linkCode: hasPendingCode ? user.zalo_bot_link_code : null,
    linkCodeExpiresAt: hasPendingCode ? codeExpiresAt : null,
  };
}

async function issueZaloBotLinkCode(userId) {
  if (!isZaloBotConfigured()) {
    const error = new Error('Kênh Zalo Bot chưa được cấu hình');
    error.statusCode = 400;
    throw error;
  }

  let linkCode = generateLinkCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [existingRows] = await pool.query(
      'SELECT id FROM users WHERE zalo_bot_link_code = ? LIMIT 1',
      [linkCode]
    );
    if (!existingRows.length) break;
    linkCode = generateLinkCode();
  }

  const expiresAt = getLinkCodeExpiresAt();

  await pool.query(
    `UPDATE users
     SET zalo_bot_link_code = ?, zalo_bot_link_code_expires_at = ?
     WHERE id = ?`,
    [linkCode, expiresAt, userId]
  );

  return getZaloBotStatus(userId);
}

async function setZaloBotNotificationsEnabled(userId, enabled) {
  const [rows] = await pool.query(
    'SELECT zalo_bot_chat_id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (!rows.length) {
    const error = new Error('Không tìm thấy tài khoản');
    error.statusCode = 404;
    throw error;
  }

  if (enabled && !rows[0].zalo_bot_chat_id) {
    const error = new Error('Bạn cần liên kết Zalo Bot trước khi bật nhận thông báo');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    'UPDATE users SET zalo_bot_notifications_enabled = ? WHERE id = ?',
    [enabled ? 1 : 0, userId]
  );

  return getZaloBotStatus(userId);
}

async function unlinkZaloBot(userId) {
  await pool.query(
    `UPDATE users
     SET zalo_bot_chat_id = NULL,
         zalo_bot_chat_name = NULL,
         zalo_bot_notifications_enabled = 0,
         zalo_bot_link_code = NULL,
         zalo_bot_link_code_expires_at = NULL,
         zalo_bot_linked_at = NULL
     WHERE id = ?`,
    [userId]
  );

  return getZaloBotStatus(userId);
}

async function sendUserZaloBotNotification(userId, title, message) {
  if (!isZaloBotConfigured()) return { ok: false, skipped: true };

  const [rows] = await pool.query(
    `SELECT zalo_bot_chat_id, zalo_bot_notifications_enabled
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = rows[0];
  if (!user?.zalo_bot_chat_id || !Number(user.zalo_bot_notifications_enabled)) {
    return { ok: false, skipped: true };
  }

  const text = [`VEXTRO`, String(title || '').trim(), String(message || '').trim()]
    .filter(Boolean)
    .join('\n\n');

  return sendZaloBotMessage(user.zalo_bot_chat_id, text);
}

async function sendAdminZaloBotNotification(title, message) {
  if (!isZaloBotConfigured()) return { ok: false, skipped: true, sent: 0 };

  const [admins] = await pool.query(
    `SELECT id, zalo_bot_chat_id
     FROM users
     WHERE role = 'ADMIN'
       AND zalo_bot_chat_id IS NOT NULL
       AND zalo_bot_notifications_enabled = 1`
  );

  if (!admins.length) {
    return { ok: false, skipped: true, sent: 0 };
  }

  const text = [`VEXTRO Admin`, String(title || '').trim(), String(message || '').trim()]
    .filter(Boolean)
    .join('\n\n');

  const results = await Promise.allSettled(
    admins.map((admin) => sendZaloBotMessage(admin.zalo_bot_chat_id, text))
  );

  const sent = results.filter((result) => result.status === 'fulfilled' && result.value?.ok).length;

  return {
    ok: sent > 0,
    sent,
    total: admins.length,
    results,
  };
}

async function handleZaloBotWebhook(body) {
  // Log body for debugging - giúp xác định cấu trúc dữ liệu thực tế
  console.log('--- Incoming Zalo Bot Webhook ---');
  console.log(JSON.stringify(body, null, 2));

  // Hỗ trợ cả định dạng Zalo Bot Platform (body.result) và Zalo OA chuẩn (body)
  const result = body?.result || body || {};
  const eventName = result?.event_name || body?.event_name;
  
  // Các sự kiện tin nhắn phổ biến: 'message.text.received' (Platform) hoặc 'user_send_text' (Zalo OA chuẩn)
  // Nếu webhook giống Telegram thì có thể không có event_name nhưng có message.text
  const isTextMessage = 
    eventName === 'message.text.received' || 
    eventName === 'user_send_text' ||
    Boolean(result?.message?.text || body?.message?.text);
  
  if (!isTextMessage) {
    console.log('Webhook ignored: Not a text message event (' + eventName + ')');
    return { ok: true, ignored: true };
  }

  const message = result?.message || body?.message;
  // Lấy chatId: Platform dùng message.chat.id, Zalo OA dùng sender.id
  const chatId = message?.chat?.id || body?.sender?.id;
  const displayName = message?.from?.display_name || body?.sender?.display_name || null;
  const text = message?.text || '';
  const linkCode = extractLinkCode(text);

  if (!chatId) {
    console.log('Webhook ignored: No chatId found');
    return { ok: true, ignored: true };
  }

  if (!linkCode) {
    await sendZaloBotMessage(
      chatId,
      'Xin chào. Để liên kết tài khoản VEXTRO, hãy vào trang hồ sơ, tạo mã liên kết rồi gửi mã đó cho bot theo dạng VXZ-XXXXXX.'
    );
    return { ok: true, ignored: true };
  }

  console.log('Searching for linkCode:', linkCode);
  const [users] = await pool.query(
    `SELECT id, full_name
     FROM users
     WHERE zalo_bot_link_code = ?
       AND zalo_bot_link_code_expires_at IS NOT NULL
       AND zalo_bot_link_code_expires_at > ?
     LIMIT 1`,
    [linkCode, new Date()]
  );


  if (!users.length) {
    console.log('No user found with this linkCode or code expired');
    await sendZaloBotMessage(chatId, 'Mã liên kết không hợp lệ hoặc đã hết hạn. Vui lòng tạo mã mới trong trang hồ sơ VEXTRO.');
    return { ok: true, ignored: true };
  }

  const targetUser = users[0];
  const [conflicts] = await pool.query(
    'SELECT id FROM users WHERE zalo_bot_chat_id = ? AND id <> ? LIMIT 1',
    [String(chatId), targetUser.id]
  );

  if (conflicts.length) {
    await sendZaloBotMessage(chatId, 'Tài khoản Zalo này đã liên kết với một tài khoản VEXTRO khác. Vui lòng hủy liên kết cũ trước.');
    return { ok: true, ignored: true };
  }

  await pool.query(
    `UPDATE users
     SET zalo_bot_chat_id = ?,
         zalo_bot_chat_name = ?,
         zalo_bot_notifications_enabled = 1,
         zalo_bot_link_code = NULL,
         zalo_bot_link_code_expires_at = NULL,
         zalo_bot_linked_at = NOW()
     WHERE id = ?`,
    [String(chatId), displayName, targetUser.id]
  );

  await sendZaloBotMessage(
    chatId,
    `✅ Chúc mừng ${targetUser.full_name}! Bạn đã liên kết thành công tài khoản VEXTRO với Zalo Bot này. Từ nay bạn sẽ nhận được các thông báo quan trọng tại đây.`
  );

  // Gửi sự kiện Realtime để Frontend cập nhật giao diện
  await triggerUserEvent(targetUser.id, 'zalo-bot:linked', {
    linked: true,
    chatName: displayName,
    chatIdMasked: maskChatId(chatId)
  });

  return { ok: true };
}

module.exports = {
  getZaloBotStatus,
  handleZaloBotWebhook,
  isZaloBotConfigured,
  issueZaloBotLinkCode,
  sendAdminZaloBotNotification,
  sendUserZaloBotNotification,
  sendZaloBotMessage,
  setZaloBotNotificationsEnabled,
  unlinkZaloBot,
};

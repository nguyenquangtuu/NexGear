const { validationResult } = require('express-validator');
const env = require('../config/env');
const {
  getZaloBotStatus,
  handleZaloBotWebhook,
  issueZaloBotLinkCode,
  isZaloBotConfigured,
  setZaloBotNotificationsEnabled,
  unlinkZaloBot,
} = require('../services/zalo-bot.service');

function getCurrentUserId(req) {
  return req.session?.user?.id || req.user?.id || null;
}

function validationError(res, req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

async function getStatus(req, res) {
  const userId = getCurrentUserId(req);

  try {
    const status = await getZaloBotStatus(userId);
    return res.json({ success: true, data: status });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể lấy trạng thái liên kết Zalo Bot' });
  }
}

async function createLinkCode(req, res) {
  const userId = getCurrentUserId(req);

  try {
    const status = await issueZaloBotLinkCode(userId);
    return res.json({ success: true, message: 'Đã tạo mã liên kết Zalo Bot', data: status });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Không thể tạo mã liên kết' });
  }
}

async function updatePreferences(req, res) {
  if (validationError(res, req)) return;

  const userId = getCurrentUserId(req);
  const { enabled } = req.body;

  try {
    const status = await setZaloBotNotificationsEnabled(userId, Boolean(enabled));
    return res.json({
      success: true,
      message: enabled ? 'Đã bật nhận thông báo qua Zalo Bot' : 'Đã tắt nhận thông báo qua Zalo Bot',
      data: status,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Không thể cập nhật cài đặt thông báo' });
  }
}

async function unlink(req, res) {
  const userId = getCurrentUserId(req);

  try {
    const status = await unlinkZaloBot(userId);
    return res.json({ success: true, message: 'Đã hủy liên kết Zalo Bot', data: status });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể hủy liên kết Zalo Bot' });
  }
}

async function webhook(req, res) {
  if (!isZaloBotConfigured()) {
    return res.status(503).json({ success: false, message: 'Zalo Bot chưa được cấu hình' });
  }

  const secretToken = req.headers['x-bot-api-secret-token'];
  if (secretToken !== env.zaloBot.webhookSecret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await handleZaloBotWebhook(req.body);
    return res.json({ success: true });
  } catch (error) {
    console.error('Zalo Bot webhook failed:', error);
    return res.status(500).json({ success: false, message: 'Webhook xử lý thất bại' });
  }
}

module.exports = {
  createLinkCode,
  getStatus,
  unlink,
  updatePreferences,
  webhook,
};

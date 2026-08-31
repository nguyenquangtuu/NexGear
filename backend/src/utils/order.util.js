const env = require('../config/env');
const { getServiceStatus, getServiceStatusLabel } = require('../services/user-service.service');

function getCurrentUserId(req) {
  return req.session?.user?.id || req.user?.id || null;
}

function generateOrderCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `VX-${y}${m}${d}-${rand}`;
}

function normalizeAlnumUpper(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function collectStringValues(value, bucket = [], depth = 0) {
  if (depth > 6) return bucket;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) bucket.push(trimmed);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, bucket, depth + 1));
    return bucket;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringValues(item, bucket, depth + 1));
  }

  return bucket;
}

function isValidSepayAuthorizationHeader(req) {
  const expectedKey = String(env.sepay?.webhookApiKey || '').trim();
  if (!expectedKey) return true;

  const authHeader = String(req.get('authorization') || '').trim();
  if (!authHeader) return false;

  // Case 1: apikey <key>
  const matched = authHeader.match(/^apikey\s+(.+)$/i);
  if (matched) {
    return String(matched[1] || '').trim() === expectedKey;
  }

  // Case 2: just <key>
  return authHeader === expectedKey;
}

function parseRequiredInputs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function normalizeDiscountCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getServiceStateMeta({ hasExpiry, expiresAt, allowRenewal }) {
  if (!hasExpiry || !expiresAt) {
    return {
      canRenew: false,
      actionText: null,
      message: null,
      status: null,
      statusLabel: null,
    };
  }

  const status = getServiceStatus(expiresAt);
  const statusLabel = getServiceStatusLabel(status);
  const renewable = !!allowRenewal;

  if (status === 'EXPIRED') {
    return {
      canRenew: false,
      actionText: 'Mua mới',
      message: renewable
        ? 'Dịch vụ đã hết hạn. Sau khi hết hạn bạn không thể gia hạn nữa và phải mua gói mới.'
        : 'Dịch vụ đã hết hạn. Gói này không hỗ trợ gia hạn, vui lòng mua gói mới.',
      status,
      statusLabel,
    };
  }

  if (renewable) {
    return {
      canRenew: true,
      actionText: 'Tạo đơn gia hạn',
      message: `Bạn có thể tạo đơn gia hạn trước khi hết hạn vào ${new Date(expiresAt).toLocaleString('vi-VN')}. Admin hoàn thành đơn thì thời gian mới sẽ được cộng tiếp từ mốc hết hạn hiện tại.`,
      status,
      statusLabel,
    };
  }

  return {
    canRenew: false,
    actionText: 'Mua mới',
    message: `Gói này không hỗ trợ gia hạn. Sau ngày ${new Date(expiresAt).toLocaleString('vi-VN')} bạn cần mua mới.`,
    status,
    statusLabel,
  };
}

function toPositiveInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  const raw = String(value ?? '').trim();
  if (!raw) return NaN;

  // Hỗ trợ cả id dạng "variant-12" hoặc "12"
  const matched = raw.match(/\d+/);
  if (!matched) return NaN;

  return Number.parseInt(matched[0], 10);
}

function buildSepayPaymentCode(orderCode) {
  return String(orderCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 25);
}

module.exports = {
  getCurrentUserId,
  generateOrderCode,
  normalizeAlnumUpper,
  collectStringValues,
  isValidSepayAuthorizationHeader,
  parseRequiredInputs,
  normalizeDiscountCode,
  getServiceStateMeta,
  toPositiveInt,
  buildSepayPaymentCode,
};

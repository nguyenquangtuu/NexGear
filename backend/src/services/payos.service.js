const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');

function getPayosConfig() {
  const clientId = String(env.payos?.clientId || '').trim();
  const apiKey = String(env.payos?.apiKey || '').trim();
  const checksumKey = String(env.payos?.checksumKey || '').trim();
  const apiBaseUrl = String(env.payos?.apiBaseUrl || 'https://api-merchant.payos.vn').replace(/\/+$/, '');

  if (!clientId || !apiKey || !checksumKey) {
    const error = new Error('PayOS chưa được cấu hình đầy đủ');
    error.code = 'PAYOS_CONFIG_MISSING';
    throw error;
  }

  return {
    clientId,
    apiKey,
    checksumKey,
    apiBaseUrl,
  };
}

function createSignature(data, checksumKey) {
  return crypto.createHmac('sha256', checksumKey).update(data).digest('hex');
}

function buildCreatePaymentSignature(payload, checksumKey) {
  const data = [
    `amount=${payload.amount}`,
    `cancelUrl=${payload.cancelUrl}`,
    `description=${payload.description}`,
    `orderCode=${payload.orderCode}`,
    `returnUrl=${payload.returnUrl}`,
  ].join('&');

  return createSignature(data, checksumKey);
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => sortObjectByKey(item)));
  }

  return JSON.stringify(sortObjectByKey(value));
}

function sortObjectByKey(input) {
  if (Array.isArray(input)) {
    return input.map((item) => sortObjectByKey(item));
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  return Object.keys(input)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectByKey(input[key]);
      return acc;
    }, {});
}

function buildWebhookSignatureData(data) {
  const sortedData = sortObjectByKey(data || {});
  return Object.keys(sortedData)
    .map((key) => `${key}=${normalizeValue(sortedData[key])}`)
    .join('&');
}

async function createPaymentLink(payload) {
  const config = getPayosConfig();
  const requestBody = {
    ...payload,
    signature: buildCreatePaymentSignature(payload, config.checksumKey),
  };

  const response = await axios.post(`${config.apiBaseUrl}/v2/payment-requests`, requestBody, {
    headers: {
      'x-client-id': config.clientId,
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  if (response.data?.code !== '00' || !response.data?.data) {
    const error = new Error(response.data?.desc || 'Không thể tạo link thanh toán PayOS');
    error.code = response.data?.code || 'PAYOS_CREATE_FAILED';
    error.data = response.data;
    throw error;
  }

  return response.data.data;
}

async function getPaymentLinkInfo(identifier) {
  const config = getPayosConfig();
  const response = await axios.get(`${config.apiBaseUrl}/v2/payment-requests/${encodeURIComponent(identifier)}`, {
    headers: {
      'x-client-id': config.clientId,
      'x-api-key': config.apiKey,
    },
    timeout: 30000,
  });

  if (response.data?.code !== '00' || !response.data?.data) {
    const error = new Error(response.data?.desc || 'Không thể lấy trạng thái thanh toán PayOS');
    error.code = response.data?.code || 'PAYOS_GET_FAILED';
    error.data = response.data;
    throw error;
  }

  return response.data.data;
}

function verifyWebhookPayload(payload) {
  const config = getPayosConfig();
  const signature = String(payload?.signature || '').trim();
  const data = payload?.data;

  if (!signature || !data || typeof data !== 'object') {
    const error = new Error('Webhook PayOS không hợp lệ');
    error.code = 'PAYOS_INVALID_WEBHOOK';
    throw error;
  }

  const expectedSignature = createSignature(buildWebhookSignatureData(data), config.checksumKey);
  if (expectedSignature !== signature) {
    const error = new Error('Chữ ký webhook PayOS không hợp lệ');
    error.code = 'PAYOS_INVALID_SIGNATURE';
    throw error;
  }

  return data;
}

module.exports = {
  createPaymentLink,
  getPaymentLinkInfo,
  verifyWebhookPayload,
};

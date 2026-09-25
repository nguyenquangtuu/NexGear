/**
 * @file payos.service.js
 * @description Payment gateway integration for PayOS (VietQR standard).
 * Handles payment link generation, transaction status polling, and SHA-256 HMAC
 * webhook signature verification according to PayOS Merchant specifications.
 */

const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');

/**
 * Retrieves and validates the active PayOS merchant credentials from environment configuration.
 *
 * @returns {{clientId: string, apiKey: string, checksumKey: string, apiBaseUrl: string}}
 * @throws {Error} Throws PAYOS_CONFIG_MISSING if credentials are unset.
 */
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

/**
 * Computes an HMAC SHA-256 hex digest for cryptographic payload authentication.
 *
 * @param {string} data - Serialized payload to sign.
 * @param {string} checksumKey - Merchant checksum secret key.
 * @returns {string} Hexadecimal HMAC signature.
 */
function createSignature(data, checksumKey) {
  return crypto.createHmac('sha256', checksumKey).update(data).digest('hex');
}

/**
 * Builds the canonical query string and calculates the signature for creating payment requests.
 *
 * @param {object} payload - Payment creation parameters.
 * @param {number} payload.amount - Transaction amount.
 * @param {string} payload.cancelUrl - URL to redirect on user cancellation.
 * @param {string} payload.description - Order summary description.
 * @param {number|string} payload.orderCode - Unique numerical order identifier.
 * @param {string} payload.returnUrl - URL to redirect upon successful payment.
 * @param {string} checksumKey - Merchant secret checksum key.
 * @returns {string} Calculated signature string.
 */
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

/**
 * Normalizes values into deterministic string representations for PayOS signature concatenation.
 *
 * @param {any} value - Input value of arbitrary type.
 * @returns {string} Stringified normalized representation.
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => sortObjectByKey(item)));
  }

  return JSON.stringify(sortObjectByKey(value));
}

/**
 * Recursively sorts an object's keys alphabetically to maintain canonical serialization order.
 *
 * @param {any} input - Object, array, or scalar to sort.
 * @returns {any} Deeply sorted object or cloned structure.
 */
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

/**
 * Serializes a webhook payload dictionary into an alphabetical key=value query string for signature verification.
 *
 * @param {object} data - Unsorted webhook data object.
 * @returns {string} Canonical signature verification string.
 */
function buildWebhookSignatureData(data) {
  const sortedData = sortObjectByKey(data || {});
  return Object.keys(sortedData)
    .map((key) => `${key}=${normalizeValue(sortedData[key])}`)
    .join('&');
}

/**
 * Creates a checkout payment link with PayOS API and embeds the computed merchant signature.
 *
 * @param {object} payload - Checkout session payload.
 * @returns {Promise<object>} PayOS checkout response containing checkoutUrl, qrCode, and paymentLinkId.
 * @throws {Error} Throws domain error when PayOS rejects the request or responds with non-00 code.
 */
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

/**
 * Queries current payment status and details for an existing payment request.
 *
 * @param {string|number} identifier - Order code or PayOS payment request ID.
 * @returns {Promise<object>} Payment information object.
 * @throws {Error} Throws domain error when lookup fails.
 */
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

/**
 * Validates the authenticity of an incoming PayOS webhook notification against merchant checksum key.
 *
 * @param {object} payload - Raw parsed JSON body of incoming webhook.
 * @param {string} payload.signature - Attached hexadecimal HMAC signature.
 * @param {object} payload.data - Transaction payload data.
 * @returns {object} Authenticated inner data object.
 * @throws {Error} Throws PAYOS_INVALID_WEBHOOK or PAYOS_INVALID_SIGNATURE if validation fails.
 */
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

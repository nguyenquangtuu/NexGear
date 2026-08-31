const pool = require('../config/mysql');
const env = require('../config/env');

function normalizePaymentCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 25);
}

async function getActiveBank(conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, bank_name, short_name, account_number, account_holder, qr_template
     FROM banks
     WHERE is_active = 1
     ORDER BY id ASC
     LIMIT 1`
  );

  if (!rows.length) {
    const error = new Error('Chua cau hinh ngan hang nhan thanh toan');
    error.statusCode = 500;
    throw error;
  }

  return rows[0];
}

function buildQrUrl(bank, paymentCode) {
  if (!bank?.qr_template) return '';
  return String(bank.qr_template)
    .replace('{CONTENT}', encodeURIComponent(String(paymentCode || '')))
    .replace('{HOLDER}', encodeURIComponent(String(bank.account_holder || '')));
}

async function createPaymentLink(payload) {
  const paymentCode = normalizePaymentCode(payload.description || payload.orderCode);
  const bank = await getActiveBank();

  return {
    id: paymentCode,
    paymentLinkId: paymentCode,
    checkoutUrl: `${env.sepay?.returnUrl || `${env.frontendOrigin}/payment-result`}?orderCode=${encodeURIComponent(payload.orderCode)}`,
    amount: Number(payload.amount || 0),
    status: 'PENDING',
    provider: 'SEPAY',
    bankName: bank.bank_name,
    bankShortName: bank.short_name,
    accountNumber: bank.account_number,
    accountHolder: bank.account_holder,
    transferContent: paymentCode,
    qrUrl: buildQrUrl(bank, paymentCode),
  };
}

async function getPaymentLinkInfo(identifier) {
  const [rows] = await pool.query(
    `SELECT *
     FROM orders
     WHERE sepay_payment_code = ?
        OR id = ?
     LIMIT 1`,
    [String(identifier), Number(identifier) || 0]
  );

  if (!rows.length) {
    const error = new Error('Khong tim thay trang thai thanh toan don hang');
    error.statusCode = 404;
    throw error;
  }

  const order = rows[0];
  const paymentStatus = String(order.sepay_status || '').toUpperCase();
  const bank = await getActiveBank();
  const paymentCode = normalizePaymentCode(order.sepay_payment_code || identifier);
  const paymentData = {
    status: paymentStatus || 'PENDING',
    provider: 'SEPAY',
    bankName: bank.bank_name,
    bankShortName: bank.short_name,
    accountNumber: bank.account_number,
    accountHolder: bank.account_holder,
    transferContent: paymentCode,
    qrUrl: buildQrUrl(bank, paymentCode),
  };

  if (order.status === 'COMPLETED' || ['PAID', 'SUCCESS'].includes(paymentStatus)) {
    return { status: 'PAID', data: { ...paymentData, status: 'PAID' } };
  }

  if (order.status === 'CANCELLED' || ['CANCELLED', 'EXPIRED'].includes(paymentStatus)) {
    return {
      status: paymentStatus || 'CANCELLED',
      data: { ...paymentData, status: paymentStatus || 'CANCELLED' },
    };
  }

  return { status: paymentStatus || 'PENDING', data: paymentData };
}

module.exports = {
  createPaymentLink,
  getPaymentLinkInfo,
};

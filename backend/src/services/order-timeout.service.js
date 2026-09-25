/**
 * @file order-timeout.service.js
 * @description Background service managing the automated lifecycle expiration for pending orders.
 * Scans for unpaid orders exceeding the payment deadline, safely refunds reserved wallet balances,
 * and updates order state with transactional consistency.
 */

const pool = require('../config/mysql');
const env = require('../config/env');
const { refundOrderAmountToBalance } = require('./order.service');

/**
 * Timeout window in seconds before a pending order is eligible for automated cancellation.
 * @type {number}
 */
const PAYMENT_TIMEOUT_SECONDS = Math.max(
  60,
  Number(env.orders?.paymentTimeoutMinutes || 15) * 60
);

/**
 * Constructs a structured audit metadata JSON string recording the timeout event details.
 *
 * @param {object} order - The order entity being cancelled.
 * @param {number} elapsedSeconds - Duration elapsed since order creation.
 * @returns {string} Serialized JSON metadata string.
 */
function buildTimeoutPaymentMeta(order, elapsedSeconds) {
  return JSON.stringify({
    source: 'TIMEOUT',
    reason: `Payment timeout exceeded ${Math.floor(PAYMENT_TIMEOUT_SECONDS / 60)} minutes`,
    elapsedSeconds,
    orderCode: order.order_code,
  });
}

/**
 * Cancels a single expired order within an existing database transaction connection.
 * Reverts any applied customer balance back to their wallet before marking the order as cancelled.
 *
 * @param {import('mysql2/promise').PoolConnection} conn - Active MySQL transaction connection.
 * @param {object} order - The order database record.
 * @returns {Promise<{cancelled: boolean, elapsedSeconds: number}>}
 */
async function cancelExpiredOrderWithConnection(conn, order) {
  const elapsedSeconds = Number(order.elapsed_seconds || 0);

  if (order.status !== 'PENDING_PAYMENT' || elapsedSeconds < PAYMENT_TIMEOUT_SECONDS) {
    return {
      cancelled: false,
      elapsedSeconds,
    };
  }

  await refundOrderAmountToBalance(
    conn,
    order,
    Number(order.balance_applied || 0),
    `Hoàn lại số dư giữ chỗ cho đơn hàng ${order.order_code} (hết thời gian thanh toán)`
  );

  await conn.query(
    `UPDATE orders
     SET status = 'CANCELLED',
         sepay_status = 'EXPIRED',
         payment_meta = ?
     WHERE id = ?`,
    [buildTimeoutPaymentMeta(order, elapsedSeconds), order.id]
  );

  return {
    cancelled: true,
    elapsedSeconds,
  };
}

/**
 * Executes a batch run to scan and cancel pending orders that exceeded the payment timeout limit.
 * Employs row-level locking (SELECT ... FOR UPDATE) to avoid race conditions with concurrent payment webhooks.
 *
 * @returns {Promise<number>} Count of cancelled expired orders.
 * @throws {Error} Rolls back transaction and rethrows if query fails.
 */
async function cancelExpiredOrdersBatch() {
  const conn = await pool.getConnection();
  let cancelledCount = 0;

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT o.*, TIMESTAMPDIFF(SECOND, o.created_at, NOW()) AS elapsed_seconds
       FROM orders o
       WHERE o.status = 'PENDING_PAYMENT'
         AND TIMESTAMPDIFF(SECOND, o.created_at, NOW()) >= ?
       ORDER BY o.id ASC
       LIMIT 100
       FOR UPDATE`,
      [PAYMENT_TIMEOUT_SECONDS]
    );

    for (const order of rows) {
      const result = await cancelExpiredOrderWithConnection(conn, order);
      if (result.cancelled) {
        cancelledCount += 1;
      }
    }

    await conn.commit();
    return cancelledCount;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  PAYMENT_TIMEOUT_SECONDS,
  cancelExpiredOrderWithConnection,
  cancelExpiredOrdersBatch,
};

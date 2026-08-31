const pool = require('../config/mysql');
const env = require('../config/env');
const { refundOrderAmountToBalance } = require('./order.service');

const PAYMENT_TIMEOUT_SECONDS = Math.max(
  60,
  Number(env.orders?.paymentTimeoutMinutes || 15) * 60
);

function buildTimeoutPaymentMeta(order, elapsedSeconds) {
  return JSON.stringify({
    source: 'TIMEOUT',
    reason: `Payment timeout exceeded ${Math.floor(PAYMENT_TIMEOUT_SECONDS / 60)} minutes`,
    elapsedSeconds,
    orderCode: order.order_code,
  });
}

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

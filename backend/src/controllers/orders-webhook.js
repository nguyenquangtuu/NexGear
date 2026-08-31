const pool = require('../config/mysql');
const { getPaymentLinkInfo } = require('../services/sepay-checkout.service');
const {
  getCurrentUserId,
  collectStringValues,
  normalizeAlnumUpper,
  isValidSepayAuthorizationHeader,
} = require('../utils/order.util');
const { refundOrderAmountToBalance, processOrderAfterPayment } = require('../services/order.service');
const {
  PAYMENT_TIMEOUT_SECONDS,
  cancelExpiredOrderWithConnection,
} = require('../services/order-timeout.service');

async function receiveSepayWebhook(req, res) {
  if (req.method === 'GET') {
    return res.json({ success: true, message: 'SePay order webhook is active' });
  }

  if (!isValidSepayAuthorizationHeader(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized webhook request' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const sepayId = payload.id;
  const transferType = String(payload.transferType || '').toLowerCase();
  const transferAmount = Number(payload.transferAmount || 0);

  if (sepayId === undefined || sepayId === null || String(sepayId).trim() === '') {
    return res.status(400).json({ success: false, message: 'Missing field: id' });
  }

  if (transferType !== 'in') {
    return res.json({ success: true, message: 'Skipped non-payment transaction' });
  }

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid transferAmount' });
  }

  const normalizedTexts = [
    ...new Set(collectStringValues(payload).map((text) => normalizeAlnumUpper(text)).filter(Boolean)),
  ];
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [candidateOrders] = await conn.query(
      `SELECT id, order_code, status, payment_amount, sepay_payment_code
       FROM orders
       WHERE status = 'PENDING_PAYMENT'
         AND sepay_payment_code IS NOT NULL
       ORDER BY id DESC
       LIMIT 200`
    );

    const matchedOrder = candidateOrders.find((order) => {
      const paymentCode = normalizeAlnumUpper(order.sepay_payment_code);
      return paymentCode && normalizedTexts.some((text) => text.includes(paymentCode));
    });

    if (!matchedOrder) {
      await conn.rollback();
      return res.json({ success: true, message: 'no_order_matched', data: { sepayId } });
    }

    const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE', [matchedOrder.id]);
    if (!orderRows.length) {
      await conn.rollback();
      return res.json({ success: true, message: 'Order no longer exists' });
    }

    const order = orderRows[0];
    if (!['COMPLETED', 'CANCELLED'].includes(order.status)) {
      if (transferAmount < Number(order.payment_amount || 0)) {
        await conn.query(
          `UPDATE orders
           SET sepay_status = ?, payment_meta = ?
           WHERE id = ?`,
          [
            'UNDERPAID',
            JSON.stringify({
              source: 'SEPAY_WEBHOOK',
              transferAmount,
              expectedAmount: Number(order.payment_amount || 0),
              sepayId,
              referenceCode: payload.referenceCode || null,
            }),
            order.id,
          ]
        );
      } else {
        await processOrderAfterPayment(conn, order.id, {
          source: 'SEPAY_WEBHOOK',
          paymentStatus: 'PAID',
          webhookData: payload,
        });

        await conn.query(
          `UPDATE orders
           SET sepay_transaction_id = ?,
               sepay_reference_code = ?,
               sepay_status = 'PAID',
               sepay_paid_at = NOW(),
               payment_meta = ?
           WHERE id = ?`,
          [
            String(sepayId),
            payload.referenceCode || null,
            JSON.stringify({
              source: 'SEPAY_WEBHOOK',
              transferAmount,
              expectedAmount: Number(order.payment_amount || 0),
              sepayId,
              referenceCode: payload.referenceCode || null,
            }),
            order.id,
          ]
        );
      }
    }

    await conn.commit();
    return res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error('Error in receiveSepayWebhook:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Không thể xử lý webhook',
    });
  } finally {
    conn.release();
  }
}

async function syncOrderPaymentStatus(req, res) {
  const userId = getCurrentUserId(req);
  const paymentOrderId = Number(req.body?.paymentOrderId || req.body?.orderId || req.body?.orderCode || 0);

  if (!paymentOrderId) {
    return res.status(400).json({ success: false, message: 'Thiếu mã thanh toán đơn hàng' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT o.*, TIMESTAMPDIFF(SECOND, o.created_at, NOW()) AS elapsed_seconds
       FROM orders o
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1 FOR UPDATE`,
      [paymentOrderId, userId]
    );

    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng thanh toán' });
    }

    const order = orderRows[0];
    const elapsedSeconds = Number(order.elapsed_seconds || 0);
    const remainingSeconds = Math.max(0, PAYMENT_TIMEOUT_SECONDS - elapsedSeconds);

    let finalStatus = order.status;

    if (order.status === 'PENDING_PAYMENT' && elapsedSeconds >= PAYMENT_TIMEOUT_SECONDS) {
      await cancelExpiredOrderWithConnection(conn, order);
      finalStatus = 'CANCELLED';
      await conn.commit();

      return res.json({
        success: true,
        data: {
          orderId: order.id,
          orderCode: order.order_code,
          status: finalStatus,
          paymentStatus: 'CANCELLED',
          balanceApplied: Number(order.balance_applied || 0),
          paymentAmount: Number(order.payment_amount || 0),
          paymentInfo: null,
          remainingSeconds: 0,
        },
      });
    }

    const paymentInfo = await getPaymentLinkInfo(order.sepay_payment_code || paymentOrderId);
    const normalizedStatus = String(paymentInfo?.status || paymentInfo?.data?.status || '').toUpperCase();
    const paymentMeta =
      order.payment_meta && typeof order.payment_meta === 'string'
        ? JSON.parse(order.payment_meta)
        : order.payment_meta || null;

    if (['PAID', 'SUCCESS'].includes(normalizedStatus) && !['COMPLETED', 'CANCELLED'].includes(order.status)) {
      const processed = await processOrderAfterPayment(conn, order.id, {
        source: 'SEPAY_SYNC',
        paymentStatus: 'PAID',
        paymentInfo,
      });
      finalStatus = processed.status;
    } else if (['CANCELLED', 'EXPIRED'].includes(normalizedStatus) && order.status === 'PENDING_PAYMENT') {
      await refundOrderAmountToBalance(
        conn,
        order,
        Number(order.balance_applied || 0),
        `Hoàn lại số dư giữ chỗ cho đơn hàng ${order.order_code}`
      );

      await conn.query(
        `UPDATE orders
         SET status = 'CANCELLED',
             sepay_status = ?,
             payment_meta = ?
         WHERE id = ?`,
        [
          normalizedStatus || 'CANCELLED',
          JSON.stringify({
            source: 'SEPAY_SYNC',
            paymentInfo,
            refundedBalanceApplied: Number(order.balance_applied || 0) > 0,
          }),
          order.id,
        ]
      );
      finalStatus = 'CANCELLED';
    }

    await conn.commit();

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        orderCode: order.order_code,
        status: finalStatus,
        paymentStatus: normalizedStatus || order.sepay_status || 'PENDING',
        balanceApplied: Number(order.balance_applied || 0),
        paymentAmount: Number(order.payment_amount || 0),
        paymentInfo: paymentInfo?.data || paymentMeta?.paymentInfo || null,
        remainingSeconds,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error in syncOrderPaymentStatus:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Không thể đồng bộ trạng thái thanh toán',
    });
  } finally {
    conn.release();
  }
}

module.exports = {
  receiveSepayWebhook,
  syncOrderPaymentStatus,
};

const axios = require('axios');
const { provisionOrderItemService } = require('./user-service.service');

async function createTransaction(conn, payload) {
  const transactionCode = payload.transactionCode || `${payload.type.slice(0, 3)}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await conn.query(
    `INSERT INTO transactions (transaction_code, user_id, type, amount, balance_before, balance_after, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionCode,
      payload.userId,
      payload.type,
      payload.amount,
      payload.balanceBefore,
      payload.balanceAfter,
      payload.description,
      payload.status || 'success',
    ]
  );
  return transactionCode;
}

async function refundOrderAmountToBalance(conn, order, amount, description) {
  const refundAmount = Number(amount || 0);
  if (refundAmount <= 0 || order.refunded_at) {
    return null;
  }

  const [userRows] = await conn.query('SELECT id, balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [order.user_id]);
  if (!userRows.length) {
    return null;
  }

  const balanceBefore = Number(userRows[0].balance || 0);
  const balanceAfter = balanceBefore + refundAmount;
  await conn.query('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, order.user_id]);

  const transactionCode = await createTransaction(conn, {
    userId: order.user_id,
    type: 'REFUND',
    amount: refundAmount,
    balanceBefore,
    balanceAfter,
    description,
  });

  await conn.query('UPDATE orders SET refunded_at = NOW() WHERE id = ?', [order.id]);

  return {
    transactionCode,
    balanceBefore,
    balanceAfter,
    amount: refundAmount,
  };
}

async function processOrderAfterPayment(conn, orderId, paymentContext = {}) {
  const [rows] = await conn.query(
    `SELECT o.*, u.email as user_email, u.full_name as user_full_name,
            oi.id as order_item_id, oi.product_id, oi.variant_id, oi.product_name, oi.variant_name,
            oi.quantity, oi.unit_price, oi.unit_cost, oi.total_price, oi.total_cost, oi.required_inputs,
            v.delivery_type, v.api_config, v.api_config_ref, v.has_expiry, v.expiry_days, v.allow_renewal, v.has_warranty, v.warranty_days
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     INNER JOIN order_items oi ON oi.order_id = o.id
     INNER JOIN product_variants v ON v.id = oi.variant_id
     WHERE o.id = ?
     FOR UPDATE`,
    [orderId]
  );

  if (!rows.length) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.statusCode = 404;
    throw error;
  }

  const order = rows[0];
  // If order is already completed, just return
  if (order.status === 'COMPLETED' || (order.status === 'PROCESSING' && order.processed_at && !paymentContext.forceStatus)) {
    return {
      order,
      status: order.status,
      results: [],
    };
  }

  if (order.status === 'CANCELLED') {
    return {
      order,
      status: order.status,
      results: [],
      refunded: !!order.refunded_at,
    };
  }

  let finalStatus = paymentContext.forceStatus || 'COMPLETED';
  const processingResults = [];

  // Process each item
  for (const item of rows) {
    let itemDeliveryData = [];
    let itemServiceMeta = null;

    // Case: Auto Delivery - Pull from warehouse
    if (item.delivery_type === 'AUTO') {
      const [availableItems] = await conn.query(
        `SELECT id, item_data
         FROM warehouse_items
         WHERE variant_id = ? AND status = 'AVAILABLE'
         ORDER BY id ASC
         LIMIT ? FOR UPDATE`,
        [item.variant_id, Number(item.quantity)]
      );

      if (availableItems.length < Number(item.quantity)) {
        // If forceStatus is set, we might allow it, but usually AUTO delivery failing warehouse check is a hard error
        // UNLESS admin is forcing completion and might have filled it manually.
        if (!paymentContext.forceStatus) {
          const error = new Error(`Kho không đủ số lượng cho sản phẩm: ${item.product_name}`);
          error.statusCode = 400;
          throw error;
        }
      } else {
        const itemIds = availableItems.map((ai) => ai.id);
        itemDeliveryData = availableItems.map((ai) => ai.item_data);
        
        await conn.query(
          `UPDATE warehouse_items
           SET status = 'SOLD', sold_at = NOW()
           WHERE id IN (?)`,
          [itemIds]
        );
      }
    } else {
      // For MANUAL/API, if not COMPLETED yet, it might need to stay in PROCESSING
      if (!paymentContext.forceStatus) {
        finalStatus = 'PROCESSING';
      }
    }



    // If status is COMPLETED (either AUTO was successful or Admin forced it)
    if (finalStatus === 'COMPLETED') {
      // 1. Provision Service if needed
      if (Number(item.has_expiry) === 1 && Number(item.expiry_days || 0) > 0) {
        itemServiceMeta = await provisionOrderItemService(conn, {
          orderId: order.id,
          orderItemId: item.order_item_id,
          userId: order.user_id,
          productId: item.product_id,
          variantId: item.variant_id,
          productName: item.product_name,
          variantName: item.variant_name,
          quantity: Number(item.quantity),
          completedAt: new Date(),
          hasExpiry: Number(item.has_expiry) === 1,
          expiryDays: Number(item.expiry_days || 0),
          allowRenewal: Number(item.allow_renewal) === 1,
        });
      }

      // 2. Set Warranty if needed
      if (Number(item.has_warranty) === 1 && Number(item.warranty_days || 0) > 0) {
        await conn.query(
          'UPDATE order_items SET warranty_started_at = NOW(), warranty_expires_at = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?',
          [Number(item.warranty_days), item.order_item_id]
        );
      }

      // 3. Update Sold Count
      await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [
        Number(item.quantity || 0),
        item.product_id
      ]);
    }

    processingResults.push({
      order_item_id: item.order_item_id,
      service: itemServiceMeta,
    });
  }

  // Update order status and timestamps
  await conn.query(
    `UPDATE orders
     SET status = ?,
         completed_at = ?,
         processed_at = NOW(),
         sepay_status = ?,
         payment_meta = ?
     WHERE id = ?`,
    [
      finalStatus,
      finalStatus === 'COMPLETED' ? new Date() : order.completed_at,
      paymentContext.paymentStatus || (Number(order.payment_amount || 0) > 0 ? 'PAID' : (order.sepay_status || 'BALANCE')),
      JSON.stringify(paymentContext || {}),
      order.id,
    ]
  );

  return {
    order,
    status: finalStatus,
    results: processingResults,
  };
}

module.exports = {
  createTransaction,
  refundOrderAmountToBalance,
  processOrderAfterPayment,
};

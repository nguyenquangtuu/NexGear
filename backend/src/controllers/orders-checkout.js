const pool = require('../config/mysql');
const env = require('../config/env');
const { createNotification } = require('../services/log.service');
const { createPaymentLink } = require('../services/sepay-checkout.service');
const {
  getServiceStatus,
} = require('../services/user-service.service');
const {
  getCurrentUserId,
  generateOrderCode,
  parseRequiredInputs,
  buildSepayPaymentCode,
} = require('../utils/order.util');
const { checkDiscountEligibility } = require('../services/discount.service');
const { processOrderAfterPayment } = require('../services/order.service');

const MIN_BANK_PAYMENT_AMOUNT = 2000;

async function createOrderWithSepay(req, res) {
  const userId = getCurrentUserId(req);
  const { variantId, quantity, requiredInputs, discountCode, deliveryMethod, pickupStore, shippingName, shippingPhone, shippingAddress, shippingNote } = req.body;

  const parsedVariantId = Number(variantId);
  const parsedQuantity = Number(quantity);
  const normalizedDeliveryMethod = deliveryMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
  const shippingFee = normalizedDeliveryMethod === 'PICKUP' ? 0 : 50000;

  if (!parsedVariantId || !parsedQuantity || parsedQuantity < 1) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc sai thông tin phân loại/số lượng' });
  }

  if (!String(shippingName || '').trim() || !String(shippingPhone || '').trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên người nhận và số điện thoại liên hệ' });
  }

  if (normalizedDeliveryMethod === 'DELIVERY' && !String(shippingAddress || '').trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ giao hàng' });
  }

  if (normalizedDeliveryMethod === 'PICKUP' && !String(pickupStore || '').trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn cửa hàng nhận hàng' });
  }



  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [variantRows] = await conn.query(
      `SELECT v.id, v.name, v.price, v.cost_price, v.stock_count, v.delivery_type, v.max_per_order, v.required_inputs,
              v.has_expiry, v.expiry_days, v.allow_renewal,
              p.id as product_id, p.name as product_name, p.category_id
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.id = ? AND p.is_active = 1 AND v.status <> 'HIDDEN'
       LIMIT 1`,
      [parsedVariantId]
    );

    if (!variantRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Phân loại hiện đang tạm ẩn hoặc sản phẩm đã được tắt để kiểm tra lại giá.',
      });
    }

    const variant = variantRows[0];
    const maxPerOrder = Number(variant.max_per_order) > 0 ? Number(variant.max_per_order) : 1;
    if (parsedQuantity > maxPerOrder) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Số lượng tối đa cho phân loại này là ${maxPerOrder}`,
      });
    }

    if (variant.delivery_type === 'AUTO') {
      const [[warehouseStock]] = await conn.query(
        `SELECT COUNT(*) as available_count
         FROM warehouse_items
         WHERE variant_id = ? AND status = 'AVAILABLE'`,
        [variant.id]
      );

      if (Number(warehouseStock?.available_count || 0) < parsedQuantity) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Sản phẩm hiện không đủ số lượng khả dụng' });
      }
    }

    if (variant.delivery_type === 'MANUAL' && Number(variant.stock_count || 0) < parsedQuantity) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Sản phẩm hiện không đủ số lượng khả dụng' });
    }

    const requiredFields = parseRequiredInputs(variant.required_inputs).filter((x) => x && x.required);
    for (const field of requiredFields) {
      const key = String(field.id || '');
      const value = requiredInputs && typeof requiredInputs === 'object' ? requiredInputs[key] : '';
      if (!String(value || '').trim()) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Thiếu thông tin bắt buộc: ${field.label || key}`,
        });
      }
    }

    const unitPrice = Number(variant.price || 0);
    const unitCost = Number(variant.cost_price || 0);
    const subtotal = unitPrice * parsedQuantity;
    const totalCost = unitCost * parsedQuantity;

    let discountId = null;
    let discountAmount = 0;
    let appliedDiscountCode = null;

    if (String(discountCode || '').trim()) {
      const eligibility = await checkDiscountEligibility(conn, {
        code: discountCode,
        userId,
        productId: variant.product_id,
        categoryId: variant.category_id,
        variantId: variant.id,
        subtotal,
      });

      if (!eligibility.valid) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: eligibility.message });
      }

      discountId = eligibility.discount.id;
      discountAmount = Number(eligibility.discountAmount || 0);
      appliedDiscountCode = eligibility.discount.code;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

    const [userRows] = await conn.query(
      'SELECT id, email, full_name FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng' });
    }
    const user = userRows[0];
    const balanceApplied = 0;
    const paymentAmount = totalAmount;
    const orderCode = generateOrderCode();

    if (paymentAmount > 0 && paymentAmount < MIN_BANK_PAYMENT_AMOUNT) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Thanh toán chuyển khoản tối thiểu ${MIN_BANK_PAYMENT_AMOUNT.toLocaleString('vi-VN')}đ.`,
        code: 'MIN_BANK_PAYMENT_AMOUNT',
        data: {
          minimumBankPaymentAmount: MIN_BANK_PAYMENT_AMOUNT,
          paymentAmount,
          totalAmount,
        },
      });
    }
    const initialStatus = paymentAmount > 0 ? 'PENDING_PAYMENT' : 'PROCESSING';
    const paymentStatus = paymentAmount > 0 ? 'PENDING' : 'FREE';

    const [orderResult] = await conn.query(
      `INSERT INTO orders (
        order_code, user_id, status, subtotal_amount, discount_amount, shipping_fee, total_amount, balance_applied,
        payment_amount, payment_provider, sepay_status, payment_meta, discount_id,
        delivery_method, pickup_store, shipping_recipient_name, shipping_phone, shipping_address, shipping_note,
        completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        orderCode,
        userId,
        initialStatus,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount,
        balanceApplied,
        paymentAmount,
        paymentAmount > 0 ? 'SEPAY' : 'FREE',
        paymentStatus,
        JSON.stringify({
          source: paymentAmount > 0 ? 'SEPAY' : 'FREE',
          appliedDiscountCode,
          deliveryMethod: normalizedDeliveryMethod,
          pickupStore: pickupStore || null,
        }),
        discountId,
        normalizedDeliveryMethod,
        pickupStore || null,
        shippingName || null,
        shippingPhone || null,
        normalizedDeliveryMethod === 'DELIVERY' ? shippingAddress || null : null,
        shippingNote || null,
        null,
      ]
    );

    const orderId = Number(orderResult.insertId);

    await conn.query(
      `INSERT INTO order_items (
        order_id, product_id, variant_id, product_name, variant_name, quantity,
        unit_price, unit_cost, total_price, total_cost, required_inputs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        variant.product_id,
        variant.id,
        variant.product_name,
        variant.name,
        parsedQuantity,
        unitPrice,
        unitCost,
        subtotal,
        totalCost,
        JSON.stringify(requiredInputs || {}),
      ]
    );

    if (discountId) {
      await conn.query('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?', [discountId]);
    }

    let checkoutUrl = null;
    let paymentLinkId = null;
    let finalStatus = initialStatus;
    let service = null;

    if (paymentAmount > 0) {
      const paymentLink = await createPaymentLink({
        orderCode: orderId,
        amount: Math.round(paymentAmount),
        description: buildSepayPaymentCode(orderCode),
        buyerName: user.full_name || undefined,
        buyerEmail: user.email || undefined,
        returnUrl: env.sepay.returnUrl || `${env.frontendOrigin}/payment-result`,
        cancelUrl: env.sepay.returnUrl || `${env.frontendOrigin}/payment-result`,
      });

      checkoutUrl = paymentLink.checkoutUrl || paymentLink.checkout_url || null;
      paymentLinkId = paymentLink.paymentLinkId || paymentLink.id || null;

      await conn.query(
        `UPDATE orders
         SET sepay_payment_code = ?, sepay_checkout_url = ?, payment_meta = ?
         WHERE id = ?`,
        [
          paymentLinkId,
          checkoutUrl,
          JSON.stringify({
            source: 'SEPAY',
            paymentInfo: paymentLink,
            checkoutUrl,
          }),
          orderId,
        ]
      );
    } else {
      const processed = await processOrderAfterPayment(conn, orderId, {
        source: 'FREE',
        paymentStatus: 'FREE',
      });
      finalStatus = processed.status;
      service = processed.results?.[0]?.service || null;
    }

    await conn.commit();

    return res.json({
      success: true,
      message: paymentAmount > 0 ? 'Đã tạo đơn hàng và liên kết thanh toán' : 'Đơn hàng đã được xử lý',
      data: {
        orderId,
        orderCode,
        status: finalStatus,
        balanceApplied,
        paymentAmount,
        paymentRequired: paymentAmount > 0,
        checkoutUrl,
        paymentLinkId,
        service,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error in createOrderWithSepay:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Không thể tạo đơn hàng',
    });
  } finally {
    conn.release();
  }
}

async function renewService(req, res) {
  const userId = getCurrentUserId(req);
  const { serviceId } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [serviceRows] = await conn.query(
      `SELECT us.*, v.price, v.cost_price, v.has_expiry, v.expiry_days, v.allow_renewal, u.email, u.full_name
       FROM user_services us
       INNER JOIN product_variants v ON v.id = us.variant_id
       INNER JOIN users u ON u.id = us.user_id
       WHERE us.id = ? AND us.user_id = ?
       LIMIT 1 FOR UPDATE`,
      [serviceId, userId]
    );

    if (!serviceRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Kh?ng t?m th?y d?ch v? c?n gia h?n' });
    }

    const service = serviceRows[0];
    const serviceStatus = getServiceStatus(service.expires_at);

    if (serviceStatus === 'EXPIRED') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'D?ch v? ?? h?t h?n, vui l?ng mua g?i m?i' });
    }

    if (Number(service.allow_renewal) !== 1) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'G?i n?y kh?ng h? tr? gia h?n, vui l?ng mua m?i' });
    }

    const quantity = Number(service.quantity || 1);
    const unitPrice = Number(service.price || 0);
    const unitCost = Number(service.cost_price || 0);
    const totalAmount = unitPrice * quantity;
    const totalCost = unitCost * quantity;
    const orderCode = generateOrderCode();

    if (totalAmount > 0 && totalAmount < MIN_BANK_PAYMENT_AMOUNT) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Thanh to?n chuy?n kho?n t?i thi?u ${MIN_BANK_PAYMENT_AMOUNT.toLocaleString('vi-VN')}?.`,
        code: 'MIN_BANK_PAYMENT_AMOUNT',
        data: {
          minimumBankPaymentAmount: MIN_BANK_PAYMENT_AMOUNT,
          paymentAmount: totalAmount,
          totalAmount,
        },
      });
    }

    const [insertOrder] = await conn.query(
      `INSERT INTO orders (
        order_code, user_id, status, subtotal_amount, discount_amount, total_amount,
        balance_applied, payment_amount, payment_provider, sepay_status, payment_meta,
        discount_id, completed_at, created_at
      ) VALUES (?, ?, 'PENDING_PAYMENT', ?, 0, ?, 0, ?, 'SEPAY', 'PENDING', ?, NULL, NULL, NOW())`,
      [
        orderCode,
        userId,
        totalAmount,
        totalAmount,
        totalAmount,
        JSON.stringify({
          source: 'SEPAY_RENEWAL',
          renewalServiceId: Number(serviceId),
        }),
      ]
    );

    const orderId = insertOrder.insertId;
    await conn.query(
      `INSERT INTO order_items (
        order_id, product_id, variant_id, product_name, variant_name,
        quantity, unit_price, unit_cost, total_price, total_cost, required_inputs,
        service_id, service_action, service_has_expiry, service_duration_days, service_allow_renewal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RENEWAL', ?, ?, ?)`,
      [
        orderId,
        service.product_id,
        service.variant_id,
        service.product_name,
        service.variant_name,
        quantity,
        unitPrice,
        unitCost,
        totalAmount,
        totalCost,
        JSON.stringify({}),
        Number(serviceId),
        Number(service.has_expiry) === 1 ? 1 : 0,
        Number(service.expiry_days || 0),
        Number(service.allow_renewal) === 1 ? 1 : 0,
      ]
    );

    const paymentLink = await createPaymentLink({
      orderCode: orderId,
      amount: Math.round(totalAmount),
      description: buildSepayPaymentCode(orderCode),
      buyerName: service.full_name || undefined,
      buyerEmail: service.email || undefined,
      returnUrl: env.sepay.returnUrl || `${env.frontendOrigin}/payment-result`,
      cancelUrl: env.sepay.returnUrl || `${env.frontendOrigin}/payment-result`,
    });

    const checkoutUrl = paymentLink.checkoutUrl || paymentLink.checkout_url || null;
    const paymentLinkId = paymentLink.paymentLinkId || paymentLink.id || null;

    await conn.query(
      `UPDATE orders
       SET sepay_payment_code = ?, sepay_checkout_url = ?, payment_meta = ?
       WHERE id = ?`,
      [
        paymentLinkId,
        checkoutUrl,
        JSON.stringify({
          source: 'SEPAY_RENEWAL',
          renewalServiceId: Number(serviceId),
          paymentInfo: paymentLink,
          checkoutUrl,
        }),
        orderId,
      ]
    );

    await conn.commit();

    createNotification({
      user_id: userId,
      email: service.email,
      type: 'ORDER_SUCCESS',
      title: '?? t?o ??n gia h?n',
      message: `??n gia h?n ${orderCode} ?? ???c t?o. Vui l?ng ho?n t?t chuy?n kho?n ?? h? th?ng x? l?.`,
      data: {
        orderId,
        orderCode,
        serviceId: Number(serviceId),
        status: 'PENDING_PAYMENT',
        productName: service.product_name,
        variantName: service.variant_name,
      },
    }).catch((err) => console.error('Failed to create renew notification:', err.message));

    return res.json({
      success: true,
      message: '?? t?o ??n gia h?n v? li?n k?t thanh to?n',
      data: {
        orderId,
        orderCode,
        status: 'PENDING_PAYMENT',
        balanceApplied: 0,
        paymentAmount: totalAmount,
        paymentRequired: true,
        checkoutUrl,
        paymentLinkId,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error in renewService:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kh?ng th? gia h?n d?ch v?',
    });
  } finally {
    conn.release();
  }
}
module.exports = {
  createOrderWithSepay,
  renewService,
};

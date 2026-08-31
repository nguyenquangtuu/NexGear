const pool = require('../config/mysql');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');
const {
  getCurrentUserId,
  toPositiveInt,
  getServiceStateMeta,
} = require('../utils/order.util');
const { syncUserServices } = require('../services/user-service.service');
const { checkDiscountEligibility } = require('../services/discount.service');

async function previewDiscount(req, res) {
  const userId = getCurrentUserId(req);
  const { variantId, quantity, discountCode, deliveryMethod } = req.body;

  const parsedVariantId = toPositiveInt(variantId);
  const parsedQuantity = toPositiveInt(quantity);
  const shippingFee = deliveryMethod === 'PICKUP' ? 0 : 50000;

  if (!parsedVariantId || !parsedQuantity || parsedQuantity < 1) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc sai thông tin phân loại/số lượng' });
  }

  const [variantRows] = await pool.query(
    `SELECT v.id, v.name, v.price, v.delivery_type, v.max_per_order, p.id as product_id, p.category_id
     FROM product_variants v
     INNER JOIN products p ON p.id = v.product_id
     WHERE v.id = ? AND p.is_active = 1
     LIMIT 1`,
    [parsedVariantId]
  );

  if (!variantRows.length) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy phân loại sản phẩm' });
  }

  const variant = variantRows[0];
  const subtotal = Number(variant.price) * parsedQuantity;

  try {
    const eligibility = await checkDiscountEligibility(pool, {
      code: discountCode,
      userId,
      productId: variant.product_id,
      categoryId: variant.category_id,
      variantId: variant.id,
      subtotal,
    });

    if (!eligibility.valid) {
      return res.status(400).json({ success: false, message: eligibility.message });
    }

    return res.json({
      success: true,
      message: 'Áp mã thành công',
      data: {
        code: eligibility.discount.code,
        discountType: eligibility.discount.discount_type,
        discountValue: Number(eligibility.discount.discount_value),
        discountAmount: Number(eligibility.discountAmount),
        subtotal,
        shippingFee,
        total: Math.max(0, subtotal - Number(eligibility.discountAmount) + shippingFee),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể kiểm tra mã giảm giá' });
  }
}

async function getMyOrders(req, res) {
  const userId = getCurrentUserId(req);

  try {
    await syncUserServices(pool, userId);

    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.status, o.subtotal_amount, o.discount_amount, o.shipping_fee, o.total_amount, o.created_at, o.completed_at,
              o.delivery_method, o.pickup_store, o.shipping_recipient_name, o.shipping_phone, o.shipping_address, o.shipping_note,
              d.code as discount_code,
              oi.product_name, oi.variant_name, oi.quantity, oi.unit_price, oi.required_inputs,
              oi.service_id, oi.service_action, oi.service_has_expiry, oi.service_duration_days, oi.service_allow_renewal,
              oi.service_started_at, oi.service_expires_at, oi.service_status,
              oi.warranty_started_at, oi.warranty_expires_at,
              us.status as current_service_status, us.expires_at as current_service_expires_at, us.allow_renewal as current_service_allow_renewal,
              pv.guide_link, pv.required_inputs as variant_required_inputs,
              p.thumbnail as product_thumbnail,
              pr.id as review_id
       FROM orders o
       LEFT JOIN discount_codes d ON d.id = o.discount_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN user_services us ON us.id = oi.service_id
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_reviews pr ON pr.order_id = o.id AND pr.product_id = oi.product_id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`,
      [userId]
    );

    const mappedOrders = orders.map((o) => {
      const hasExpiry = Number(o.service_has_expiry) === 1;
      const expiresAt = o.current_service_expires_at || o.service_expires_at || null;
      const allowRenewal =
        o.current_service_allow_renewal === null || o.current_service_allow_renewal === undefined
          ? Number(o.service_allow_renewal) === 1
          : Number(o.current_service_allow_renewal) === 1;
      const serviceState = getServiceStateMeta({
        hasExpiry,
        expiresAt,
        allowRenewal,
      });

      return {
        ...o,
        is_reviewed: !!o.review_id,
        guide_link: o.guide_link || '',
        delivery_method: o.delivery_method || 'DELIVERY',
        pickup_store: o.pickup_store || '',
        shipping_fee: Number(o.shipping_fee || 0),
        shipping_recipient_name: o.shipping_recipient_name || '',
        shipping_phone: o.shipping_phone || '',
        shipping_address: o.shipping_address || '',
        shipping_note: o.shipping_note || '',

        service: hasExpiry
          ? {
              id: o.service_id,
              action: o.service_action || 'NEW',
              durationDays: Number(o.service_duration_days || 0),
              startedAt: o.service_started_at,
              expiresAt,
              hasExpiry,
              allowRenewal,
              status: serviceState.status,
              statusLabel: serviceState.statusLabel,
              canRenew: serviceState.canRenew,
              actionText: serviceState.actionText,
              message: serviceState.message,
            }
          : null,
      };
    });

    return res.json({ success: true, data: normalizeUploadPathsDeep(mappedOrders) });
  } catch (error) {
    console.error('Error in getMyOrders:', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách đơn hàng' });
  }
}

async function getMyServices(req, res) {
  const userId = getCurrentUserId(req);

  try {
    await syncUserServices(pool, userId);

    const [services] = await pool.query(
      `SELECT us.*, pv.guide_link, p.thumbnail as product_thumbnail, o.order_code as latest_order_code
       FROM user_services us
       LEFT JOIN product_variants pv ON pv.id = us.variant_id
       LEFT JOIN products p ON p.id = us.product_id
       LEFT JOIN orders o ON o.id = us.latest_order_id
       WHERE us.user_id = ?
       ORDER BY us.expires_at ASC, us.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: normalizeUploadPathsDeep(services.map((service) => {
        const serviceState = getServiceStateMeta({
          hasExpiry: Number(service.has_expiry) === 1,
          expiresAt: service.expires_at,
          allowRenewal: Number(service.allow_renewal) === 1,
        });

        return {
          id: service.id,
          productId: service.product_id,
          variantId: service.variant_id,
          productName: service.product_name,
          variantName: service.variant_name,
          quantity: Number(service.quantity || 1),
          durationDays: Number(service.duration_days || 0),
          allowRenewal: Number(service.allow_renewal) === 1,
          thumbnail: service.product_thumbnail,
          latestOrderId: service.latest_order_id,
          latestOrderCode: service.latest_order_code,
          guideLink: service.guide_link || '',
          startedAt: service.started_at,
          expiresAt: service.expires_at,
          status: serviceState.status,
          statusLabel: serviceState.statusLabel,
          canRenew: serviceState.canRenew,
          actionText: serviceState.actionText,
          message: serviceState.message,
        };
      })),
    });
  } catch (error) {
    console.error('Error in getMyServices:', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách dịch vụ' });
  }
}

module.exports = {
  previewDiscount,
  getMyOrders,
  getMyServices,
};

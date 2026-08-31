const { normalizeDiscountCode } = require('../utils/order.util');

async function checkDiscountEligibility(conn, payload) {
  const { code, userId, productId, categoryId, variantId, subtotal } = payload;

  if (!code) {
    return {
      valid: false,
      message: 'Vui lòng nhập mã giảm giá',
    };
  }

  const [rows] = await conn.query(
    `SELECT * FROM discount_codes WHERE code = ? LIMIT 1`,
    [normalizeDiscountCode(code)]
  );

  if (!rows.length) {
    return { valid: false, message: 'Mã giảm giá không tồn tại' };
  }

  const discount = rows[0];
  if (!discount.is_active) {
    return { valid: false, message: 'Mã giảm giá đã bị vô hiệu hóa' };
  }

  const now = Date.now();
  if (discount.starts_at && new Date(discount.starts_at).getTime() > now) {
    return { valid: false, message: 'Mã giảm giá chưa đến thời gian áp dụng' };
  }
  if (discount.ends_at && new Date(discount.ends_at).getTime() < now) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn' };
  }

  if (Number(discount.usage_limit_total || 0) > 0 && Number(discount.used_count || 0) >= Number(discount.usage_limit_total)) {
    return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
  }

  if (Number(discount.min_order_amount || 0) > 0 && Number(subtotal) < Number(discount.min_order_amount)) {
    return {
      valid: false,
      message: `Đơn hàng cần tối thiểu ${Number(discount.min_order_amount).toLocaleString('vi-VN')}đ để áp mã`,
    };
  }

  const [[productScope]] = await conn.query('SELECT COUNT(*) as total FROM discount_products WHERE discount_id = ?', [discount.id]);
  if (productScope.total > 0) {
    const [[allowedProduct]] = await conn.query(
      'SELECT COUNT(*) as total FROM discount_products WHERE discount_id = ? AND product_id = ?',
      [discount.id, productId]
    );
    if (!allowedProduct.total) {
      return { valid: false, message: 'Mã giảm giá không áp dụng cho sản phẩm này' };
    }
  }

  const [[categoryScope]] = await conn.query('SELECT COUNT(*) as total FROM discount_categories WHERE discount_id = ?', [discount.id]);
  if (categoryScope.total > 0) {
    const [[allowedCategory]] = await conn.query(
      'SELECT COUNT(*) as total FROM discount_categories WHERE discount_id = ? AND category_id = ?',
      [discount.id, categoryId]
    );
    if (!allowedCategory.total) {
      return { valid: false, message: 'Mã giảm giá không áp dụng cho danh mục này' };
    }
  }

  const [[variantScope]] = await conn.query('SELECT COUNT(*) as total FROM discount_variants WHERE discount_id = ?', [discount.id]);
  if (variantScope.total > 0) {
    const [[allowedVariant]] = await conn.query(
      'SELECT COUNT(*) as total FROM discount_variants WHERE discount_id = ? AND variant_id = ?',
      [discount.id, variantId]
    );
    if (!allowedVariant.total) {
      return { valid: false, message: 'Mã giảm giá không áp dụng cho phân loại này' };
    }
  }

  const [[userScope]] = await conn.query('SELECT COUNT(*) as total FROM discount_users WHERE discount_id = ?', [discount.id]);
  if (userScope.total > 0) {
    const [[allowedUser]] = await conn.query(
      'SELECT COUNT(*) as total FROM discount_users WHERE discount_id = ? AND user_id = ?',
      [discount.id, userId]
    );
    if (!allowedUser.total) {
      return { valid: false, message: 'Mã giảm giá không áp dụng cho tài khoản của bạn' };
    }
  }

  if (Number(discount.usage_limit_per_user || 0) > 0) {
    const [[usedByUser]] = await conn.query(
      `SELECT COUNT(*) as total
       FROM orders
       WHERE user_id = ? AND discount_id = ?`,
      [userId, discount.id]
    );

    if (Number(usedByUser.total) >= Number(discount.usage_limit_per_user)) {
      return { valid: false, message: 'Bạn đã dùng hết lượt mã giảm giá này' };
    }
  }

  let discountAmount = 0;
  if (discount.discount_type === 'PERCENT') {
    discountAmount = (Number(subtotal) * Number(discount.discount_value)) / 100;
    if (Number(discount.max_discount_amount || 0) > 0) {
      discountAmount = Math.min(discountAmount, Number(discount.max_discount_amount));
    }
  } else {
    discountAmount = Number(discount.discount_value);
  }

  discountAmount = Math.max(0, Math.min(discountAmount, Number(subtotal)));

  return {
    valid: true,
    discount,
    discountAmount,
  };
}

module.exports = {
  checkDiscountEligibility,
};

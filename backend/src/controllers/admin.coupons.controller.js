const pool = require('../config/mysql');

function normalizeMysqlDateTime(value) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const datetimeLocalMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (datetimeLocalMatch) {
    const [, datePart, timePart, secondPart] = datetimeLocalMatch;
    return `${datePart} ${timePart}:${secondPart || '00'}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  const seconds = String(parsed.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const getCoupons = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM discount_codes ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const createCoupon = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      code, name, description,
      discount_type, discount_value, max_discount_amount, min_order_amount,
      usage_limit_total, usage_limit_per_user,
      starts_at, ends_at, is_active,
      productIds, categoryIds, variantIds, userIds
    } = req.body;

    const normalizedStartsAt = normalizeMysqlDateTime(starts_at);
    const normalizedEndsAt = normalizeMysqlDateTime(ends_at);

    const [result] = await conn.query(
      `INSERT INTO discount_codes (
        code, name, description, discount_type, discount_value, 
        max_discount_amount, min_order_amount, usage_limit_total, usage_limit_per_user, 
        starts_at, ends_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code, name, description || null, discount_type, discount_value || 0,
        max_discount_amount || null, min_order_amount || 0, usage_limit_total || 0, usage_limit_per_user || 0,
        normalizedStartsAt, normalizedEndsAt, is_active ? 1 : 0
      ]
    );

    const discountId = result.insertId;

    // Helper to split comma-separated IDs
    const parseIds = (str) => (str ? String(str).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0) : []);

    const pIds = parseIds(productIds);
    if (pIds.length > 0) {
      await conn.query('INSERT IGNORE INTO discount_products (discount_id, product_id) VALUES ?', [pIds.map(id => [discountId, id])]);
    }

    const cIds = parseIds(categoryIds);
    if (cIds.length > 0) {
      await conn.query('INSERT IGNORE INTO discount_categories (discount_id, category_id) VALUES ?', [cIds.map(id => [discountId, id])]);
    }

    const vIds = parseIds(variantIds);
    if (vIds.length > 0) {
      await conn.query('INSERT IGNORE INTO discount_variants (discount_id, variant_id) VALUES ?', [vIds.map(id => [discountId, id])]);
    }

    const uIds = parseIds(userIds);
    if (uIds.length > 0) {
      await conn.query('INSERT IGNORE INTO discount_users (discount_id, user_id) VALUES ?', [uIds.map(id => [discountId, id])]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Tạo mã thành công' });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const deleteCoupon = async (req, res) => {
    try {
        await pool.query('DELETE FROM discount_codes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa mã giảm giá thành công' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
}

const getVariantsForSearch = async (req, res) => {
  try {
    const search = req.query.search || '';
    const productIdsStr = req.query.productIds || '';
    
    let query = `
      SELECT v.id, v.name, p.name as product_name
      FROM product_variants v
      INNER JOIN products p ON p.id = v.product_id
      WHERE 1=1
    `;
    let params = [];
    
    if (productIdsStr) {
      const pIds = productIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      if (pIds.length > 0) {
        query += ` AND v.product_id IN (?)`;
        params.push(pIds);
      }
    }
    
    if (search) {
      query += ` AND (v.name LIKE ? OR p.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY p.id DESC, v.id ASC LIMIT 50`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getCouponById = async (req, res) => {
  try {
    const couponId = req.params.id;
    const [couponRows] = await pool.query('SELECT * FROM discount_codes WHERE id = ?', [couponId]);
    if (!couponRows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
    
    const coupon = couponRows[0];
    
    const [products] = await pool.query('SELECT product_id FROM discount_products WHERE discount_id = ?', [couponId]);
    const [categories] = await pool.query('SELECT category_id FROM discount_categories WHERE discount_id = ?', [couponId]);
    const [variants] = await pool.query('SELECT variant_id FROM discount_variants WHERE discount_id = ?', [couponId]);
    const [users] = await pool.query('SELECT user_id FROM discount_users WHERE discount_id = ?', [couponId]);
    
    coupon.productIds = products.map(p => p.product_id).join(',');
    coupon.categoryIds = categories.map(c => c.category_id).join(',');
    coupon.variantIds = variants.map(v => v.variant_id).join(',');
    coupon.userIds = users.map(u => u.user_id).join(',');
    
    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateCoupon = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const couponId = req.params.id;
    const {
      code, name, description,
      discount_type, discount_value, max_discount_amount, min_order_amount,
      usage_limit_total, usage_limit_per_user,
      starts_at, ends_at, is_active,
      productIds, categoryIds, variantIds, userIds
    } = req.body;

    const normalizedStartsAt = normalizeMysqlDateTime(starts_at);
    const normalizedEndsAt = normalizeMysqlDateTime(ends_at);

    await conn.query(
      `UPDATE discount_codes SET 
        code=?, name=?, description=?, discount_type=?, discount_value=?, 
        max_discount_amount=?, min_order_amount=?, usage_limit_total=?, usage_limit_per_user=?, 
        starts_at=?, ends_at=?, is_active=?
       WHERE id=?`,
      [
        code, name, description || null, discount_type, discount_value || 0,
        max_discount_amount || null, min_order_amount || 0, usage_limit_total || 0, usage_limit_per_user || 0,
        normalizedStartsAt, normalizedEndsAt, is_active ? 1 : 0,
        couponId
      ]
    );

    const parseIds = (str) => (str ? String(str).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0) : []);

    await conn.query('DELETE FROM discount_products WHERE discount_id = ?', [couponId]);
    const pIds = parseIds(productIds);
    if (pIds.length > 0) await conn.query('INSERT IGNORE INTO discount_products (discount_id, product_id) VALUES ?', [pIds.map(id => [couponId, id])]);

    await conn.query('DELETE FROM discount_categories WHERE discount_id = ?', [couponId]);
    const cIds = parseIds(categoryIds);
    if (cIds.length > 0) await conn.query('INSERT IGNORE INTO discount_categories (discount_id, category_id) VALUES ?', [cIds.map(id => [couponId, id])]);

    await conn.query('DELETE FROM discount_variants WHERE discount_id = ?', [couponId]);
    const vIds = parseIds(variantIds);
    if (vIds.length > 0) await conn.query('INSERT IGNORE INTO discount_variants (discount_id, variant_id) VALUES ?', [vIds.map(id => [couponId, id])]);

    await conn.query('DELETE FROM discount_users WHERE discount_id = ?', [couponId]);
    const uIds = parseIds(userIds);
    if (uIds.length > 0) await conn.query('INSERT IGNORE INTO discount_users (discount_id, user_id) VALUES ?', [uIds.map(id => [couponId, id])]);

    await conn.commit();
    res.json({ success: true, message: 'Cập nhật mã thành công' });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const getCouponUsage = async (req, res) => {
  try {
    const couponId = req.params.id;
    const [rows] = await pool.query(
      `SELECT o.id, o.order_code, o.total_amount, o.discount_amount, o.created_at, u.email as user_email
       FROM orders o
       INNER JOIN users u ON u.id = o.user_id
       WHERE o.discount_id = ?
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [couponId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = { getCoupons, createCoupon, deleteCoupon, getVariantsForSearch, getCouponById, updateCoupon, getCouponUsage };

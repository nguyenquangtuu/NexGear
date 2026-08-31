const pool = require('../config/mysql');
const { getCurrentUserId } = require('../utils/order.util');
const { validateReviewContent } = require('../services/ai.service');

const REVIEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

async function submitReview(req, res) {
  const userId = getCurrentUserId(req);
  const { orderId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5' });
  }

  const aiValidation = await validateReviewContent(comment, rating);
  if (!aiValidation.valid) {
    return res.status(400).json({ 
      success: false, 
      message: 'Đánh giá không được chấp nhận: ' + (aiValidation.reason || 'Nội dung không phù hợp') 
    });
  }


  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT o.id, o.status, o.completed_at, oi.product_id
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ? AND o.user_id = ? AND o.status = 'COMPLETED'
       LIMIT 1`,
      [orderId, userId]
    );

    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng hoàn thành để đánh giá' });
    }

    const order = orderRows[0];

    if (order.completed_at) {
      const completedTime = new Date(order.completed_at).getTime();
      const now = Date.now();
      if (now - completedTime > REVIEW_WINDOW_MS) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Đã quá thời hạn 3 ngày để đánh giá đơn hàng này' });
      }
    }

    const [existingReview] = await conn.query(
      'SELECT id FROM product_reviews WHERE order_id = ? AND product_id = ?',
      [order.id, order.product_id]
    );

    if (existingReview.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm trong đơn hàng này rồi' });
    }

    const isVisible = rating >= 4 ? 1 : 0;

    await conn.query(
      `INSERT INTO product_reviews (order_id, product_id, user_id, rating, comment, is_visible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [order.id, order.product_id, userId, rating, comment, isVisible]
    );

    const [[stats]] = await conn.query(
      `SELECT COUNT(*) as count, AVG(rating) as avg_rating
       FROM product_reviews
       WHERE product_id = ? AND is_visible = 1`,
      [order.product_id]
    );

    await conn.query(
      `UPDATE products 
       SET rating = ?, review_count = ?
       WHERE id = ?`,
      [stats.avg_rating, stats.count, order.product_id]
    );

    await conn.commit();
    return res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ success: false, message: 'Không thể gửi đánh giá' });
  } finally {
    conn.release();
  }
}

module.exports = {
  submitReview,
};

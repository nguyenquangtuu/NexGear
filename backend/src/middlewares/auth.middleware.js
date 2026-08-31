const pool = require('../config/mysql');

async function requireAuth(req, res, next) {
  const user = req.session?.user || req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập',
    });
  }

  try {
    const [rows] = await pool.query('SELECT is_blocked, block_reason FROM users WHERE id = ? LIMIT 1', [user.id]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });
    }

    if (rows[0].is_blocked) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(403).json({
        success: false,
        message: rows[0].block_reason || 'Tài khoản của bạn đã bị khóa truy cập hệ thống.',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xác thực người dùng' });
  }
}

function requireAdmin(req, res, next) {
  const user = req.session?.user || req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập',
    });
  }

  if (user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập trang này',
    });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};

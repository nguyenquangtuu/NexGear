const pool = require('../config/mysql');
const { writeLog } = require('../services/log.service');

async function getMyTransactions(req, res) {
  const userId = req.session.user.id;
  const { startDate, endDate, type } = req.query;

  try {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      
      // Limit range to 7 days
      const diffTime = Math.abs(e - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        return res.status(400).json({
          success: false,
          message: 'Khoảng cách giữa ngày bắt đầu và ngày kết thúc tối đa là 7 ngày'
        });
      }

      query += ' AND created_at >= ? AND created_at <= ?';
      // Adjust endDate to end of day
      e.setHours(23, 59, 59, 999);
      params.push(s, e);
    }

    if (type && type !== 'ALL') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);

    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    await writeLog({
      level: 'error',
      action: 'GET_TRANSACTIONS_FAILED',
      message: error.message,
      meta: { userId }
    });
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}

exports.getMyTransactions = getMyTransactions;

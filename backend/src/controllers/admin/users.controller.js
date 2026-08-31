const pool = require('../../config/mysql');
const { logActivity, createNotification } = require('../../services/log.service');
const { sendAdminBroadcastEmail, getEmailErrorMessage, getEmailErrorDetails } = require('../../services/email.service');
const { generateTransactionCode } = require('./dashboard.controller');

function normalizeBulkEmailAudienceType(value) {
  const audienceType = String(value || '').trim().toUpperCase();
  return ['ALL_USERS', 'MANUAL_EMAILS', 'PRODUCT_BUYERS', 'VARIANT_BUYERS'].includes(audienceType)
    ? audienceType
    : '';
}

function normalizeEmailAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailAddress(value));
}

function parseManualEmailList(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/\r?\n/)
        .map((item) => normalizeEmailAddress(item))
        .filter((item) => item && isValidEmailAddress(item))
    )
  );
}

async function resolveBulkEmailRecipients({
  audienceType,
  manualEmails,
  productId,
  variantId,
}) {
  if (audienceType === 'ALL_USERS') {
    const [rows] = await pool.query(
      `SELECT id, email, full_name
       FROM users
       WHERE email IS NOT NULL
         AND TRIM(email) <> ''
         AND is_blocked = 0
       ORDER BY id DESC`
    );

    return rows
      .map((row) => ({
        user_id: row.id,
        email: normalizeEmailAddress(row.email),
        full_name: row.full_name || '',
      }))
      .filter((row) => isValidEmailAddress(row.email));
  }

  if (audienceType === 'MANUAL_EMAILS') {
    return parseManualEmailList(manualEmails).map((email) => ({
      user_id: null,
      email,
      full_name: '',
    }));
  }

  if (audienceType === 'PRODUCT_BUYERS') {
    const normalizedProductId = Number(productId);
    if (!normalizedProductId) {
      throw Object.assign(new Error('Thiếu sản phẩm để lọc người nhận'), { statusCode: 400 });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT u.id as user_id, u.email, u.full_name
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       INNER JOIN users u ON u.id = o.user_id
       WHERE oi.product_id = ?
         AND o.status IN ('PROCESSING', 'COMPLETED')
         AND u.is_blocked = 0
         AND u.email IS NOT NULL
         AND TRIM(u.email) <> ''
       ORDER BY u.id DESC`,
      [normalizedProductId]
    );

    return rows
      .map((row) => ({
        user_id: row.user_id,
        email: normalizeEmailAddress(row.email),
        full_name: row.full_name || '',
      }))
      .filter((row) => isValidEmailAddress(row.email));
  }

  if (audienceType === 'VARIANT_BUYERS') {
    const normalizedVariantId = Number(variantId);
    if (!normalizedVariantId) {
      throw Object.assign(new Error('Thiếu phân loại để lọc người nhận'), { statusCode: 400 });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT u.id as user_id, u.email, u.full_name
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       INNER JOIN users u ON u.id = o.user_id
       WHERE oi.variant_id = ?
         AND o.status IN ('PROCESSING', 'COMPLETED')
         AND u.is_blocked = 0
         AND u.email IS NOT NULL
         AND TRIM(u.email) <> ''
       ORDER BY u.id DESC`,
      [normalizedVariantId]
    );

    return rows
      .map((row) => ({
        user_id: row.user_id,
        email: normalizeEmailAddress(row.email),
        full_name: row.full_name || '',
      }))
      .filter((row) => isValidEmailAddress(row.email));
  }

  throw Object.assign(new Error('Nhóm người nhận không hợp lệ'), { statusCode: 400 });
}

const previewBulkEmailAudience = async (req, res) => {
  try {
    const source = req.method === 'POST' ? req.body || {} : req.query || {};
    const audienceType = normalizeBulkEmailAudienceType(source.audienceType);
    if (!audienceType) {
      return res.status(400).json({ success: false, message: 'Nhóm người nhận không hợp lệ' });
    }

    const recipients = await resolveBulkEmailRecipients({
      audienceType,
      manualEmails: source.manualEmails,
      productId: source.productId,
      variantId: source.variantId,
    });

    return res.json({
      success: true,
      data: {
        total: recipients.length,
        recipients: recipients.slice(0, 50),
      },
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ success: false, message: error.message });
    }

    console.error('Error previewing bulk email audience:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const sendBulkEmail = async (req, res) => {
  try {
    const audienceType = normalizeBulkEmailAudienceType(req.body?.audienceType);
    const subject = String(req.body?.subject || '').trim();
    const content = String(req.body?.content || '').trim();

    if (!audienceType) {
      return res.status(400).json({ success: false, message: 'Nhóm người nhận không hợp lệ' });
    }

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề email' });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung email' });
    }

    const recipients = await resolveBulkEmailRecipients({
      audienceType,
      manualEmails: req.body?.manualEmails,
      productId: req.body?.productId,
      variantId: req.body?.variantId,
    });

    if (!recipients.length) {
      return res.status(400).json({ success: false, message: 'Không có người nhận hợp lệ' });
    }

    const delivered = [];
    const failed = [];

    for (const recipient of recipients) {
      try {
        const result = await sendAdminBroadcastEmail({
          toEmail: recipient.email,
          subject,
          content,
        });

        delivered.push({
          email: recipient.email,
          full_name: recipient.full_name,
          messageId: result.messageId || '',
        });
      } catch (error) {
        failed.push({
          email: recipient.email,
          full_name: recipient.full_name,
          error: getEmailErrorMessage(error),
          details: getEmailErrorDetails(error),
        });
      }
    }

    return res.json({
      success: failed.length === 0,
      message:
        failed.length === 0
          ? `Đã gửi ${delivered.length} email thành công`
          : `Đã gửi ${delivered.length}/${recipients.length} email thành công`,
      data: {
        total: recipients.length,
        deliveredCount: delivered.length,
        failedCount: failed.length,
        delivered: delivered.slice(0, 20),
        failed: failed.slice(0, 20),
      },
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ success: false, message: error.message });
    }

    console.error('Error sending bulk email:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, full_name, role, balance, total_deposit, is_email_verified, is_blocked, block_reason, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params = [];

    if (search) {
      query += ' WHERE email LIKE ? OR full_name LIKE ?';
      countQuery += ' WHERE email LIKE ? OR full_name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [users] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, params.slice(0, 2));

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, email, full_name, role, balance, total_deposit, is_email_verified, is_blocked, block_reason, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const [recentTransactions] = await pool.query(
      `SELECT id, transaction_code, type, amount, balance_before, balance_after, description, status, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );

    const [recentOrders] = await pool.query(
      `SELECT id, order_code, status, subtotal_amount, discount_amount, total_amount, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...rows[0],
        recentTransactions,
        recentOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ success: false, message: 'Email và họ tên là bắt buộc' });
    }

    if (role && !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!existingUser.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, id]);
    if (existingEmail.length) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
    }

    if (role) {
      await pool.query('UPDATE users SET email = ?, full_name = ?, role = ? WHERE id = ?', [email, full_name, role, id]);
    } else {
      await pool.query('UPDATE users SET email = ?, full_name = ? WHERE id = ?', [email, full_name, id]);
    }

    return res.json({ success: true, message: 'Cập nhật thông tin người dùng thành công' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const adjustUserBalance = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { action, amount, reason, countAsDeposit } = req.body;

    if (!['ADD', 'SUBTRACT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do (ít nhất 3 ký tự)' });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT id, balance, total_deposit FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = rows[0];
    const balanceBefore = Number(user.balance || 0);
    const totalDepositBefore = Number(user.total_deposit || 0);

    const isSubtract = action === 'SUBTRACT';
    const delta = isSubtract ? -numericAmount : numericAmount;
    const balanceAfter = balanceBefore + delta;

    if (balanceAfter < 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Số dư không đủ để trừ' });
    }

    let totalDepositAfter = totalDepositBefore;
    const shouldCountDeposit = !isSubtract && !!countAsDeposit;
    if (shouldCountDeposit) {
      totalDepositAfter += numericAmount;
    }

    await conn.query('UPDATE users SET balance = ?, total_deposit = ? WHERE id = ?', [balanceAfter, totalDepositAfter, id]);

    const txType = isSubtract ? 'PURCHASE' : shouldCountDeposit ? 'DEPOSIT' : 'BONUS';
    const txCode = generateTransactionCode('ADM');
    const txDescription = `ADMIN_${action}: ${String(reason).trim()}${shouldCountDeposit ? ' | COUNT_AS_DEPOSIT=1' : ''}`;

    await conn.query(
      `INSERT INTO transactions
      (transaction_code, user_id, type, amount, balance_before, balance_after, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'success')`,
      [txCode, id, txType, numericAmount, balanceBefore, balanceAfter, txDescription]
    );

    await conn.commit();

    await logActivity({
      user_id: req.session?.user?.id || req.user?.id,
      action: 'ADMIN_ADJUST_BALANCE',
      target_id: id,
      target_type: 'USER',
      description: `Admin ${action} ${numericAmount} balance for user ID ${id}. Reason: ${reason}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      meta: { action, amount: numericAmount, reason, countAsDeposit, txCode }
    });

    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [id]);
    const userEmail = userRows[0]?.email;
    const isAdd = action === 'ADD';
    createNotification({
      user_id: id,
      email: userEmail,
      type: 'BALANCE_ADJUSTED',
      title: isAdd ? 'Tài khoản được cộng tiền' : 'Tài khoản bị trừ tiền',
      message: `Admin đã ${isAdd ? 'cộng' : 'trừ'} ${numericAmount.toLocaleString('vi-VN')}đ ${reason ? `với lý do: ${reason}` : ''}.`,
      data: { action, amount: numericAmount, reason, txCode }
    }).catch(err => console.error('Failed to create balance notification:', err.message));

    return res.json({
      success: true,
      message: 'Cập nhật số dư thành công',
      data: {
        balanceBefore,
        balanceAfter,
        totalDepositBefore,
        totalDepositAfter,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error adjusting user balance:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const updateUserBlockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockReason = '' } = req.body;

    const [existingUser] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!existingUser.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (isBlocked) {
      if (!blockReason || String(blockReason).trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do chặn (ít nhất 3 ký tự)' });
      }
      await pool.query('UPDATE users SET is_blocked = 1, block_reason = ? WHERE id = ?', [String(blockReason).trim(), id]);
    } else {
      await pool.query('UPDATE users SET is_blocked = 0, block_reason = NULL WHERE id = ?', [id]);
    }

    await logActivity({
      user_id: req.session?.user?.id || req.user?.id,
      action: isBlocked ? 'ADMIN_BLOCK_USER' : 'ADMIN_UNBLOCK_USER',
      target_id: id,
      target_type: 'USER',
      description: isBlocked ? `Admin blocked user ID ${id}. Reason: ${blockReason}` : `Admin unblocked user ID ${id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      meta: { isBlocked, blockReason }
    });

    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [id]);
    const userEmail = userRows[0]?.email;
    createNotification({
      user_id: id,
      email: userEmail,
      type: isBlocked ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
      title: isBlocked ? 'Tài khoản bị khóa' : 'Tài khoản đã được mở khóa',
      message: isBlocked 
        ? `Tài khoản của bạn đã bị khóa bởi quản trị viên. Lý do: ${blockReason}`
        : 'Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập lại.',
      data: { isBlocked, blockReason }
    }).catch(err => console.error('Failed to create block notification:', err.message));

    return res.json({
      success: true,
      message: isBlocked ? 'Đã chặn người dùng' : 'Đã mở chặn người dùng',
    });
  } catch (error) {
    console.error('Error updating user block status:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    return res.json({ success: true, message: 'Cập nhật quyền thành công' });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  getUsers,
  getUserDetail,
  updateUserProfile,
  adjustUserBalance,
  updateUserBlockStatus,
  updateUserRole,
  previewBulkEmailAudience,
  sendBulkEmail,
};

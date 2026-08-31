const pool = require('../config/mysql');
const env = require('../config/env');
const { createNotification, logActivity, writeLog } = require('../services/log.service');

function getCurrentUserId(req) {
  return (req.user && req.user.id) || (req.session?.user && req.session.user.id) || null;
}

function formatVnd(amount) {
  return Number(amount || 0).toLocaleString('vi-VN');
}

function normalizeAlnumUpper(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function collectStringValues(value, bucket = [], depth = 0) {
  if (depth > 6) return bucket;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) bucket.push(trimmed);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, bucket, depth + 1));
    return bucket;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringValues(item, bucket, depth + 1));
  }

  return bucket;
}

function extractDepositCodesFromTexts(texts) {
  const candidates = [];

  texts.forEach((text) => {
    const upper = String(text || '').toUpperCase();
    const tokenized = upper.replace(/[^A-Z0-9]/g, ' ');
    const matched = tokenized.match(/VEXTRO[A-Z0-9]{4,20}/g);
    if (matched && matched.length) candidates.push(...matched);
  });

  return [...new Set(candidates)];
}

function buildWebhookTextContext(payload) {
  const rawTexts = collectStringValues(payload);
  const normalizedTexts = [...new Set(rawTexts.map((text) => normalizeAlnumUpper(text)).filter(Boolean))];
  const detectedCodes = extractDepositCodesFromTexts(rawTexts);

  return {
    rawTexts: [...new Set(rawTexts)],
    normalizedTexts,
    detectedCodes,
  };
}

async function resolveUserFromWebhook(payload, webhookTextContext) {
  const { detectedCodes, normalizedTexts } = webhookTextContext;

  if (detectedCodes.length) {
    const [exactUsers] = await pool.query(
      `SELECT id, email, deposit_code
       FROM users
       WHERE deposit_code IN (?)
       ORDER BY CHAR_LENGTH(deposit_code) DESC
       LIMIT 1`,
      [detectedCodes]
    );

    if (exactUsers.length) {
      return { user: exactUsers[0], matchedCode: exactUsers[0].deposit_code, method: 'EXACT_CODE_MATCH' };
    }
  }

  const [candidateUsers] = await pool.query(
    `SELECT id, email, deposit_code
     FROM users
     WHERE deposit_code IS NOT NULL AND deposit_code <> '' AND deposit_code LIKE 'VEXTRO%'`
  );

  let bestMatched = null;
  for (const user of candidateUsers) {
    const normalizedCode = normalizeAlnumUpper(user.deposit_code);
    if (!normalizedCode || !normalizedCode.startsWith('VEXTRO')) continue;

    const found = normalizedTexts.some((text) => text.includes(normalizedCode));
    if (!found) continue;

    if (!bestMatched || normalizedCode.length > normalizeAlnumUpper(bestMatched.deposit_code).length) {
      bestMatched = user;
    }
  }

  if (bestMatched) {
    return { user: bestMatched, matchedCode: bestMatched.deposit_code, method: 'CONTENT_SCAN_MATCH' };
  }

  return { user: null, matchedCode: null, method: 'NOT_FOUND' };
}

function isValidSepayAuthorizationHeader(req) {
  const expectedKey = String(env.sepay?.webhookApiKey || '').trim();
  if (!expectedKey) return true;

  const authHeader = String(req.get('authorization') || '').trim();
  if (!authHeader) return false;

  // Case 1: apikey <key>
  const matched = authHeader.match(/^apikey\s+(.+)$/i);
  if (matched) {
    return String(matched[1] || '').trim() === expectedKey;
  }

  // Case 2: just <key>
  return authHeader === expectedKey;
}

function buildSepayTransactionCode(sepayId) {
  const normalizedId = String(sepayId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 35);
  if (normalizedId) {
    return `SEPAY${normalizedId}`;
  }
  return `SEPAY${Date.now()}`;
}

/**
 * Lay lich su nap tien cua nguoi dung hien tai
 * Ho tro phan trang va loc trong 7 ngay gan nhat
 */
exports.getDepositHistory = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Ban chua dang nhap' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [rows] = await pool.query(
      `SELECT id, transaction_code as id_code, amount, status, created_at, description as method
       FROM transactions
       WHERE user_id = ? AND type = 'DEPOSIT' AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, sevenDaysAgo, limit, offset]
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND type = 'DEPOSIT' AND created_at >= ?",
      [userId, sevenDaysAgo]
    );

    const total = countResult[0].total;

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return res.status(500).json({ success: false, message: 'Loi he thong khi lay lich su nap tien' });
  }
};

/**
 * Webhook SePay: tu dong cong tien khi co giao dich chuyen khoan vao.
 * Endpoint nay phai duoc goi tu SePay, khong yeu cau dang nhap.
 */
exports.receiveSepayWebhook = async (req, res) => {
  if (req.method === 'GET') {
    return res.json({ success: true, message: 'SePay deposit webhook is active' });
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

  if (!['in', 'out'].includes(transferType)) {
    return res.status(400).json({ success: false, message: 'Invalid transferType' });
  }

  if (transferType !== 'in') {
    return res.json({
      success: true,
      message: 'Skipped non-deposit transaction',
      data: { sepayId, transferType },
    });
  }

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid transferAmount' });
  }

  const webhookTextContext = buildWebhookTextContext(payload);
  const resolved = await resolveUserFromWebhook(payload, webhookTextContext);
  if (!resolved.user) {
    await writeLog({
      level: 'warn',
      action: 'SEPAY_NO_USER_MATCHED',
      message: `Không tìm thấy user cho giao dịch ${sepayId}`,
      meta: {
        sepayId,
        transferType,
        transferAmount,
        detectedCodes: webhookTextContext.detectedCodes,
        normalizedTexts: webhookTextContext.normalizedTexts.slice(0, 20),
        payload,
      },
    });

    return res.json({
      success: true,
      message: 'no_user_matched',
      data: {
        sepayId,
        detectedCodes: webhookTextContext.detectedCodes,
      },
    });
  }

  const user = resolved.user;
  const conn = await pool.getConnection();
  const transactionCode = buildSepayTransactionCode(sepayId);

  try {
    await conn.beginTransaction();

    const [lockedUsers] = await conn.query(
      'SELECT id, balance, total_deposit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
      [user.id]
    );

    if (!lockedUsers.length) {
      await conn.rollback();
      return res.json({
        success: true,
        message: 'Skipped transaction because user no longer exists',
        data: { sepayId, userId: user.id },
      });
    }

    const balanceBefore = Number(lockedUsers[0].balance || 0);
    const totalDepositBefore = Number(lockedUsers[0].total_deposit || 0);
    const balanceAfter = balanceBefore + transferAmount;
    const totalDepositAfter = totalDepositBefore + transferAmount;

    const txDescription = `SEPAY gateway=${payload.gateway || ''}; ref=${payload.referenceCode || ''}; content=${payload.content || ''}`;

    await conn.query(
      `INSERT INTO transactions
      (transaction_code, user_id, type, amount, balance_before, balance_after, description, status)
      VALUES (?, ?, 'DEPOSIT', ?, ?, ?, ?, 'success')`,
      [transactionCode, user.id, transferAmount, balanceBefore, balanceAfter, txDescription]
    );

    await conn.query(
      'UPDATE users SET balance = ?, total_deposit = ? WHERE id = ?',
      [balanceAfter, totalDepositAfter, user.id]
    );

    await conn.commit();

    await logActivity({
      user_id: user.id,
      email: user.email || null,
      action: 'SEPAY_DEPOSIT_SUCCESS',
      target_id: transactionCode,
      target_type: 'TRANSACTION',
      description: `SePay nạp tiền thành công ${transferAmount} cho user ${user.id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      meta: {
        sepayId,
        transferAmount,
        transferType,
        matchedCode: resolved.matchedCode,
        matchingMethod: resolved.method,
        referenceCode: payload.referenceCode || null,
        gateway: payload.gateway || null,
        transactionDate: payload.transactionDate || null,
      },
    });

    await createNotification({
      user_id: user.id,
      email: user.email,
      type: 'DEPOSIT_SUCCESS',
      title: 'Nạp tiền thành công',
      message: `Hệ thống đã cộng ${formatVnd(transferAmount)}đ vào ví của bạn. Số dư mới: ${formatVnd(balanceAfter)}đ.`,
      data: {
        transactionCode,
        sepayId,
        amount: transferAmount,
        balanceBefore,
        balanceAfter,
        matchedCode: resolved.matchedCode,
        referenceCode: payload.referenceCode || null,
      },
    });

    return res.json({
      success: true,
      message: 'Deposit processed',
      data: {
        sepayId,
        transactionCode,
        userId: user.id,
        amount: transferAmount,
      },
    });
  } catch (error) {
    await conn.rollback();

    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.json({
        success: true,
        message: 'Duplicate webhook ignored',
        data: { sepayId, transactionCode },
      });
    }

    console.error('Error processing SePay webhook:', error);
    return res.status(500).json({ success: false, message: 'Cannot process webhook' });
  } finally {
    conn.release();
  }
};

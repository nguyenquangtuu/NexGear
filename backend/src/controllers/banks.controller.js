const pool = require('../config/mysql');

function normalizeBankPayload(input = {}) {
  return {
    bank_name: String(input.bank_name || '').trim(),
    short_name: String(input.short_name || '').trim(),
    account_number: String(input.account_number || '').trim(),
    account_holder: String(input.account_holder || '').trim(),
    qr_template: String(input.qr_template || '').trim(),
    min_deposit: Math.max(0, Number(input.min_deposit || 0)),
    is_active: input.is_active === false ? 0 : 1,
  };
}

function validateBankPayload(payload) {
  if (!payload.bank_name) return 'Bank name is required';
  if (!payload.short_name) return 'Short name is required';
  if (!payload.account_number) return 'Account number is required';
  if (!payload.account_holder) return 'Account holder is required';
  if (!payload.qr_template) return 'QR template is required';
  if (!Number.isFinite(payload.min_deposit) || payload.min_deposit < 0) return 'Minimum deposit is invalid';
  return null;
}

const getBanks = async (req, res) => {
  try {
    const [settingRows] = await pool.query('SELECT deposit_enabled FROM site_settings ORDER BY id ASC LIMIT 1');
    if (settingRows.length && Number(settingRows[0].deposit_enabled) === 0) {
      return res.status(403).json({ success: false, message: 'Tính năng nạp tiền hiện đang tạm tắt' });
    }

    const includeInactive = req.query.includeInactive === '1';
    const query = includeInactive
      ? `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
         FROM banks
         ORDER BY is_active DESC, id ASC`
      : `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
         FROM banks
         WHERE is_active = 1
         ORDER BY id ASC`;

    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching banks:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const updateBankStatus = async (req, res) => {
  try {
    const bankId = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isInteger(bankId) || bankId <= 0) {
      return res.status(400).json({ success: false, message: 'ID ngân hàng không hợp lệ' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive phải là kiểu boolean' });
    }

    const [result] = await pool.query('UPDATE banks SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, bankId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngân hàng' });
    }

    const [rows] = await pool.query(
      `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
       FROM banks WHERE id = ? LIMIT 1`,
      [bankId]
    );

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating bank status:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getBanks,
  updateBankStatus,
  async getAdminBanks(_req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
         FROM banks
         ORDER BY is_active DESC, id ASC`
      );
      return res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching admin banks:', error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  },
  async createAdminBank(req, res) {
    try {
      const payload = normalizeBankPayload(req.body);
      const validationError = validateBankPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const [result] = await pool.query(
        `INSERT INTO banks (bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.bank_name,
          payload.short_name,
          payload.account_number,
          payload.account_holder,
          payload.qr_template,
          payload.min_deposit,
          payload.is_active,
        ]
      );

      const [rows] = await pool.query(
        `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
         FROM banks WHERE id = ? LIMIT 1`,
        [result.insertId]
      );

      return res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error creating admin bank:', error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  },
  async updateAdminBank(req, res) {
    try {
      const bankId = Number(req.params.id);
      if (!Number.isInteger(bankId) || bankId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid bank id' });
      }

      const payload = normalizeBankPayload(req.body);
      const validationError = validateBankPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const [result] = await pool.query(
        `UPDATE banks
         SET bank_name = ?, short_name = ?, account_number = ?, account_holder = ?, qr_template = ?, min_deposit = ?, is_active = ?
         WHERE id = ?`,
        [
          payload.bank_name,
          payload.short_name,
          payload.account_number,
          payload.account_holder,
          payload.qr_template,
          payload.min_deposit,
          payload.is_active,
          bankId,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Bank not found' });
      }

      const [rows] = await pool.query(
        `SELECT id, bank_name, short_name, account_number, account_holder, qr_template, min_deposit, is_active, created_at
         FROM banks WHERE id = ? LIMIT 1`,
        [bankId]
      );

      return res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error updating admin bank:', error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  },
  async deleteAdminBank(req, res) {
    try {
      const bankId = Number(req.params.id);
      if (!Number.isInteger(bankId) || bankId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid bank id' });
      }

      const [result] = await pool.query('DELETE FROM banks WHERE id = ?', [bankId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Bank not found' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting admin bank:', error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  },
};

const pool = require('../config/mysql');

function buildPlaceholderEmail(provider, providerId) {
  const safeProviderId = String(providerId).replace(/[^a-zA-Z0-9_.-]/g, '');
  if (provider === 'zalo') return `zalo_${safeProviderId}@zalo.local`;
  return `${provider}_${safeProviderId}@social.local`;
}

const handleSocialLogin = async (profile, provider) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const providerId = profile.id;
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const fullName = profile.displayName || profile.name || profile.username || 'User';

    // 1. Check if social account already exists
    const [socialAccounts] = await conn.query(
      'SELECT user_id FROM user_social_accounts WHERE provider = ? AND provider_id = ?',
      [provider, providerId]
    );

    if (socialAccounts.length > 0) {
      const userId = socialAccounts[0].user_id;
      const [users] = await conn.query(
        'SELECT id, email, full_name, role, deposit_code, balance FROM users WHERE id = ?',
        [userId]
      );
      await conn.commit();
      return users[0];
    }

    // 2. If email exists, check if user exists by email
    let user;
    if (email) {
      const [existingUsers] = await conn.query(
        'SELECT id, email, full_name, role, deposit_code, balance FROM users WHERE email = ?',
        [email]
      );
      if (existingUsers.length > 0) {
        user = existingUsers[0];
      }
    }

    // 3. Create user if not exists
    if (!user) {
      let depositCode;
      let isUnique = false;
      while (!isUnique) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        depositCode = 'VEXTRO' + randomStr;
        const [existingCode] = await conn.query('SELECT id FROM users WHERE deposit_code = ?', [depositCode]);
        if (!existingCode.length) isUnique = true;
      }

      const userEmail = email || buildPlaceholderEmail(provider, providerId);
      const isEmailVerified = email ? 1 : 0;
      const [insertResult] = await conn.query(
        'INSERT INTO users (email, full_name, password_hash, is_email_verified, deposit_code) VALUES (?, ?, ?, ?, ?)',
        [userEmail, fullName, null, isEmailVerified, depositCode]
      );
      
      const userId = insertResult.insertId;
      const [newUsers] = await conn.query(
        'SELECT id, email, full_name, role, deposit_code, balance FROM users WHERE id = ?',
        [userId]
      );
      user = newUsers[0];
    }

    // 4. Link social account to user
    // Only allow linking if not already linked to any social account
    const [existingLinks] = await conn.query(
      'SELECT id FROM user_social_accounts WHERE user_id = ?',
      [user.id]
    );

    if (existingLinks.length > 0) {
      await conn.rollback();
      throw new Error('Tài khoản này đã liên kết với một mạng xã hội khác. Mỗi tài khoản chỉ được liên kết với duy nhất một mạng xã hội.');
    }

    await conn.query(
      'INSERT INTO user_social_accounts (user_id, provider, provider_id, email) VALUES (?, ?, ?, ?)',
      [user.id, provider, providerId, email]
    );

    await conn.commit();
    return user;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  handleSocialLogin,
};

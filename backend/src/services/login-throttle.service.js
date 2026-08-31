const pool = require('../config/mysql');
const env = require('../config/env');

function getLockUntil(attempts, firstFailedAt) {
  const failedWindowMs = env.security.login.failedWindowMinutes * 60 * 1000;
  const threshold = env.security.login.maxFailedAttempts;
  const lockMinutes = env.security.login.lockMinutes;

  if (!attempts || !firstFailedAt) return null;

  const windowExpired = Date.now() - new Date(firstFailedAt).getTime() > failedWindowMs;
  if (windowExpired || attempts < threshold) return null;

  return new Date(new Date(firstFailedAt).getTime() + failedWindowMs + lockMinutes * 60 * 1000);
}

async function getAttemptRow(email, ipAddress) {
  const [rows] = await pool.query(
    `SELECT id, failed_attempts, first_failed_at, last_failed_at, lock_until
     FROM login_attempts
     WHERE email = ? AND ip_address = ?
     LIMIT 1`,
    [email, ipAddress]
  );

  return rows[0] || null;
}

async function ensureNotLocked(email, ipAddress) {
  const row = await getAttemptRow(email, ipAddress);

  if (!row) {
    return { locked: false };
  }

  if (row.lock_until && new Date(row.lock_until).getTime() > Date.now()) {
    return {
      locked: true,
      lockUntil: row.lock_until,
      retryAfterSeconds: Math.ceil((new Date(row.lock_until).getTime() - Date.now()) / 1000),
    };
  }

  return { locked: false };
}

async function recordFailedLogin(email, ipAddress) {
  const now = new Date();
  const row = await getAttemptRow(email, ipAddress);
  const failedWindowMs = env.security.login.failedWindowMinutes * 60 * 1000;

  if (!row) {
    const lockUntil =
      env.security.login.maxFailedAttempts <= 1
        ? new Date(now.getTime() + env.security.login.lockMinutes * 60 * 1000)
        : null;

    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, failed_attempts, first_failed_at, last_failed_at, lock_until)
       VALUES (?, ?, 1, ?, ?, ?)`,
      [email, ipAddress, now, now, lockUntil]
    );

    return;
  }

  const windowExpired = !row.first_failed_at || now.getTime() - new Date(row.first_failed_at).getTime() > failedWindowMs;

  const nextFailedAttempts = windowExpired ? 1 : row.failed_attempts + 1;
  const firstFailedAt = windowExpired ? now : new Date(row.first_failed_at);
  const calculatedLockUntil = getLockUntil(nextFailedAttempts, firstFailedAt);

  await pool.query(
    `UPDATE login_attempts
     SET failed_attempts = ?,
         first_failed_at = ?,
         last_failed_at = ?,
         lock_until = ?
     WHERE id = ?`,
    [nextFailedAttempts, firstFailedAt, now, calculatedLockUntil, row.id]
  );
}

async function clearLoginAttempts(email, ipAddress) {
  await pool.query('DELETE FROM login_attempts WHERE email = ? AND ip_address = ?', [email, ipAddress]);
}

module.exports = {
  ensureNotLocked,
  recordFailedLogin,
  clearLoginAttempts,
};

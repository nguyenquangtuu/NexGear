const pool = require('../config/mysql');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');

const DEFAULT_SITE_SETTINGS = {
  site_name: 'NEXGEAR',
  site_title: 'NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng',
  site_description:
    'NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp.',
  site_keywords:
    'nexgear, laptop, linh kiện máy tính, thiết bị công nghệ, chính hãng, giá tốt, bảo hành, dịch vụ chuyên nghiệp',
  og_title: 'NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng',
  og_description:
    'NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp.',
  og_image_url: '/images/brand/logo-dark.png',
  favicon_url: '/images/brand/favicon.png',
  deposit_enabled: true,
};

function normalizeSiteSettings(row) {
  const normalized = {
    ...DEFAULT_SITE_SETTINGS,
    ...(row || {}),
  };

  normalized.deposit_enabled = normalizeBoolean(
    normalized.deposit_enabled,
    DEFAULT_SITE_SETTINGS.deposit_enabled
  );

  return normalizeUploadPathsDeep(normalized);
}

function sanitizeString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }

  return fallback;
}

async function ensureSingletonRow() {
  const [rows] = await pool.query('SELECT id FROM site_settings ORDER BY id ASC LIMIT 1');
  if (rows.length > 0) {
    return rows[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO site_settings
      (site_name, site_title, site_description, site_keywords, og_title, og_description, og_image_url, favicon_url, deposit_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_SITE_SETTINGS.site_name,
      DEFAULT_SITE_SETTINGS.site_title,
      DEFAULT_SITE_SETTINGS.site_description,
      DEFAULT_SITE_SETTINGS.site_keywords,
      DEFAULT_SITE_SETTINGS.og_title,
      DEFAULT_SITE_SETTINGS.og_description,
      DEFAULT_SITE_SETTINGS.og_image_url,
      DEFAULT_SITE_SETTINGS.favicon_url,
      DEFAULT_SITE_SETTINGS.deposit_enabled ? 1 : 0,
    ]
  );

  return result.insertId;
}

async function getCurrentSiteSettings() {
  const rowId = await ensureSingletonRow();
  const [rows] = await pool.query(
    `SELECT id, site_name, site_title, site_description, site_keywords, og_title, og_description, og_image_url, favicon_url, deposit_enabled,
            created_at, updated_at
     FROM site_settings
     WHERE id = ?
     LIMIT 1`,
    [rowId]
  );

  return normalizeSiteSettings(rows[0] || null);
}

async function getPublicSiteSettings(_req, res) {
  try {
    const settings = await getCurrentSiteSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching public site settings:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching site settings' });
  }
}

async function getAdminSiteSettings(_req, res) {
  try {
    const settings = await getCurrentSiteSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching admin site settings:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching site settings' });
  }
}

async function updateAdminSiteSettings(req, res) {
  try {
    const id = await ensureSingletonRow();
    const payload = {
      site_name: sanitizeString(req.body.site_name, 120) || DEFAULT_SITE_SETTINGS.site_name,
      site_title: sanitizeString(req.body.site_title, 255) || DEFAULT_SITE_SETTINGS.site_title,
      site_description: sanitizeString(req.body.site_description, 2000) || DEFAULT_SITE_SETTINGS.site_description,
      site_keywords: sanitizeString(req.body.site_keywords, 2000) || DEFAULT_SITE_SETTINGS.site_keywords,
      og_title: sanitizeString(req.body.og_title, 255) || sanitizeString(req.body.site_title, 255) || DEFAULT_SITE_SETTINGS.og_title,
      og_description:
        sanitizeString(req.body.og_description, 2000) ||
        sanitizeString(req.body.site_description, 2000) ||
        DEFAULT_SITE_SETTINGS.og_description,
      og_image_url: sanitizeString(req.body.og_image_url, 500) || DEFAULT_SITE_SETTINGS.og_image_url,
      favicon_url: sanitizeString(req.body.favicon_url, 500) || DEFAULT_SITE_SETTINGS.favicon_url,
      deposit_enabled: normalizeBoolean(req.body.deposit_enabled, DEFAULT_SITE_SETTINGS.deposit_enabled),
    };

    await pool.query(
      `UPDATE site_settings
       SET site_name = ?, site_title = ?, site_description = ?, site_keywords = ?, og_title = ?, og_description = ?, og_image_url = ?, favicon_url = ?, deposit_enabled = ?
       WHERE id = ?`,
      [
        payload.site_name,
        payload.site_title,
        payload.site_description,
        payload.site_keywords,
        payload.og_title,
        payload.og_description,
        payload.og_image_url,
        payload.favicon_url,
        payload.deposit_enabled ? 1 : 0,
        id,
      ]
    );

    const settings = await getCurrentSiteSettings();
    return res.json({ success: true, data: settings, message: 'Updated site settings successfully' });
  } catch (error) {
    console.error('Error updating admin site settings:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating site settings' });
  }
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  getPublicSiteSettings,
  getAdminSiteSettings,
  updateAdminSiteSettings,
};

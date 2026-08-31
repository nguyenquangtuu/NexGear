const pool = require('../config/mysql');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');

const SLOT_KEYS = [
  'hero_main',
  'hero_side_top',
  'hero_side_bottom',
  'hero_bottom_1',
  'hero_bottom_2',
  'hero_bottom_3',
  'hero_bottom_4',
];

const OVERLAY_PRESETS = ['dark-left', 'dark-soft', 'accent-red', 'accent-blue', 'none'];
const TEXT_ALIGNS = ['left', 'center'];
const TEXT_COLORS = ['light', 'dark'];
const IMAGE_POSITIONS = ['left', 'center', 'right'];

function normalizeSlides(input, fallbackBanner) {
  let source = [];
  if (Array.isArray(input)) {
    source = input;
  } else if (typeof input === 'string' && input) {
    try {
      source = JSON.parse(input);
    } catch (_error) {
      source = [];
    }
  }

  const slides = source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      title: String(item.title || '').trim(),
      subtitle: String(item.subtitle || '').trim(),
      badge_text: String(item.badge_text || '').trim(),
      image_url: String(item.image_url || '').trim(),
      image_url_mobile: String(item.image_url_mobile || '').trim(),
      target_url: String(item.target_url || '').trim(),
      alt_text: String(item.alt_text || '').trim(),
      overlay_preset: OVERLAY_PRESETS.includes(item.overlay_preset) ? item.overlay_preset : 'dark-left',
      text_align: TEXT_ALIGNS.includes(item.text_align) ? item.text_align : 'left',
      text_color: TEXT_COLORS.includes(item.text_color) ? item.text_color : 'light',
      desktop_image_position: IMAGE_POSITIONS.includes(item.desktop_image_position) ? item.desktop_image_position : 'center',
      mobile_image_position: IMAGE_POSITIONS.includes(item.mobile_image_position) ? item.mobile_image_position : 'center',
      sort_order: Number(item.sort_order ?? index + 1),
      is_active: item.is_active !== false,
    }))
    .filter((item) => item.image_url)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (slides.length > 0) {
    return slides;
  }

  if (!fallbackBanner) {
    return [];
  }

  return [
    {
      title: String(fallbackBanner.title || '').trim(),
      subtitle: String(fallbackBanner.subtitle || '').trim(),
      badge_text: String(fallbackBanner.badge_text || '').trim(),
      image_url: String(fallbackBanner.image_url || '').trim(),
      image_url_mobile: String(fallbackBanner.image_url_mobile || '').trim(),
      target_url: String(fallbackBanner.target_url || '').trim(),
      alt_text: String(fallbackBanner.alt_text || '').trim(),
      overlay_preset: OVERLAY_PRESETS.includes(fallbackBanner.overlay_preset) ? fallbackBanner.overlay_preset : 'dark-left',
      text_align: TEXT_ALIGNS.includes(fallbackBanner.text_align) ? fallbackBanner.text_align : 'left',
      text_color: TEXT_COLORS.includes(fallbackBanner.text_color) ? fallbackBanner.text_color : 'light',
      desktop_image_position: IMAGE_POSITIONS.includes(fallbackBanner.desktop_image_position) ? fallbackBanner.desktop_image_position : 'center',
      mobile_image_position: IMAGE_POSITIONS.includes(fallbackBanner.mobile_image_position) ? fallbackBanner.mobile_image_position : 'center',
      sort_order: 1,
      is_active: fallbackBanner.is_active !== false,
    },
  ];
}

function normalizeBanner(row) {
  const slides = normalizeSlides(row.slides_json, row);
  const primarySlide = slides[0] || null;

  return normalizeUploadPathsDeep({
    ...row,
    is_active: !!row.is_active,
    desktop_image_position: primarySlide?.desktop_image_position || 'center',
    mobile_image_position: primarySlide?.mobile_image_position || 'center',
    slides,
  });
}

function validateBannerPayload(payload, { requireSlotKey = false } = {}) {
  const {
    slot_key,
    slot_name,
    title,
    subtitle = '',
    badge_text = '',
    image_url,
    image_url_mobile = '',
    target_url = '',
    alt_text = '',
    overlay_preset = 'dark-left',
    text_align = 'left',
    text_color = 'light',
    desktop_image_position = 'center',
    mobile_image_position = 'center',
    sort_order = 0,
    is_active = true,
    slides = [],
  } = payload;

  if (requireSlotKey && (!slot_key || !SLOT_KEYS.includes(slot_key))) {
    return { error: 'Vị trí banner không hợp lệ' };
  }

  if (!image_url || String(image_url).trim().length < 5) {
    return { error: 'Vui lòng chọn ảnh banner' };
  }

  if (!OVERLAY_PRESETS.includes(overlay_preset)) {
    return { error: 'Kiểu overlay không hợp lệ' };
  }

  if (!TEXT_ALIGNS.includes(text_align)) {
    return { error: 'Canh chữ không hợp lệ' };
  }

  if (!TEXT_COLORS.includes(text_color)) {
    return { error: 'Màu chữ không hợp lệ' };
  }

  const normalizedSlides = normalizeSlides(slides, {
    title,
    subtitle,
    badge_text,
    image_url,
    image_url_mobile,
    target_url,
    alt_text,
    overlay_preset,
    text_align,
    text_color,
    desktop_image_position,
    mobile_image_position,
    is_active,
  });

  if (slot_key === 'hero_main' && normalizedSlides.length === 0) {
    return { error: 'Banner chính giữa cần ít nhất một slide hợp lệ' };
  }

  return {
    data: {
      ...(requireSlotKey ? { slot_key } : {}),
      slot_name: String(slot_name || 'Banner').trim() || 'Banner',
      title: String(title || '').trim(),
      subtitle: String(subtitle || '').trim(),
      badge_text: String(badge_text || '').trim(),
      image_url: String(image_url).trim(),
      image_url_mobile: String(image_url_mobile || '').trim(),
      target_url: String(target_url || '').trim(),
      alt_text: String(alt_text || '').trim(),
      overlay_preset,
      text_align,
      text_color,
      sort_order: Number(sort_order || 0),
      is_active: is_active ? 1 : 0,
      slides_json: JSON.stringify(normalizedSlides),
    },
  };
}

async function getPublicHomeBanners(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, slot_key, slot_name, title, subtitle, badge_text, slides_json, image_url, image_url_mobile, target_url, alt_text,
              overlay_preset, text_align, text_color, sort_order, is_active
       FROM home_banners
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );

    const banners = rows.map(normalizeBanner);
    const bySlot = Object.fromEntries(banners.map((banner) => [banner.slot_key, banner]));

    return res.json({ success: true, data: { banners, bySlot } });
  } catch (error) {
    console.error('Error fetching public home banners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy banner trang chủ' });
  }
}

async function getAdminHomeBanners(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, slot_key, slot_name, title, subtitle, badge_text, slides_json, image_url, image_url_mobile, target_url, alt_text,
              overlay_preset, text_align, text_color, sort_order, is_active, created_at, updated_at
       FROM home_banners
       ORDER BY sort_order ASC, id ASC`
    );

    return res.json({ success: true, data: rows.map(normalizeBanner) });
  } catch (error) {
    console.error('Error fetching admin home banners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách banner' });
  }
}

async function createAdminHomeBanner(req, res) {
  try {
    const validated = validateBannerPayload(req.body, { requireSlotKey: true });
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    const [existing] = await pool.query('SELECT id FROM home_banners WHERE slot_key = ? LIMIT 1', [validated.data.slot_key]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Vị trí banner này đã tồn tại' });
    }

    const [result] = await pool.query(
      `INSERT INTO home_banners
       (slot_key, slot_name, title, subtitle, badge_text, slides_json, image_url, image_url_mobile, target_url, alt_text, overlay_preset, text_align, text_color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.data.slot_key,
        validated.data.slot_name,
        validated.data.title,
        validated.data.subtitle,
        validated.data.badge_text,
        validated.data.slides_json,
        validated.data.image_url,
        validated.data.image_url_mobile,
        validated.data.target_url,
        validated.data.alt_text,
        validated.data.overlay_preset,
        validated.data.text_align,
        validated.data.text_color,
        validated.data.sort_order,
        validated.data.is_active,
      ]
    );

    return res.json({ success: true, message: 'Tạo banner thành công', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating admin home banner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo banner' });
  }
}

async function updateAdminHomeBanner(req, res) {
  try {
    const { id } = req.params;
    const validated = validateBannerPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    const [existing] = await pool.query('SELECT id FROM home_banners WHERE id = ? LIMIT 1', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
    }

    await pool.query(
      `UPDATE home_banners
       SET slot_name = ?, title = ?, subtitle = ?, badge_text = ?, slides_json = ?, image_url = ?, image_url_mobile = ?, target_url = ?, alt_text = ?,
           overlay_preset = ?, text_align = ?, text_color = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [
        validated.data.slot_name,
        validated.data.title,
        validated.data.subtitle,
        validated.data.badge_text,
        validated.data.slides_json,
        validated.data.image_url,
        validated.data.image_url_mobile,
        validated.data.target_url,
        validated.data.alt_text,
        validated.data.overlay_preset,
        validated.data.text_align,
        validated.data.text_color,
        validated.data.sort_order,
        validated.data.is_active,
        id,
      ]
    );

    return res.json({ success: true, message: 'Cập nhật banner thành công' });
  } catch (error) {
    console.error('Error updating admin home banner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật banner' });
  }
}

async function deleteAdminHomeBanner(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM home_banners WHERE id = ? LIMIT 1', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
    }

    await pool.query('DELETE FROM home_banners WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Xóa banner thành công' });
  } catch (error) {
    console.error('Error deleting admin home banner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xóa banner' });
  }
}

module.exports = {
  SLOT_KEYS,
  OVERLAY_PRESETS,
  TEXT_ALIGNS,
  TEXT_COLORS,
  getPublicHomeBanners,
  getAdminHomeBanners,
  createAdminHomeBanner,
  updateAdminHomeBanner,
  deleteAdminHomeBanner,
};

const pool = require('../config/mysql');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');

async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY parent_id ASC, sort_order ASC, name ASC');
    
    // Build tree structure
    const categoryMap = {};
    const tree = [];

    rows.forEach(cat => {
      categoryMap[cat.id] = { ...cat, subCategories: [] };
    });

    rows.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].subCategories.push(categoryMap[cat.id]);
      } else if (!cat.parent_id) {
        tree.push(categoryMap[cat.id]);
      }
    });

    res.json({ success: true, data: normalizeUploadPathsDeep(tree) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh mục' });
  }
}

module.exports = {
  getCategories
};

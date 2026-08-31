const pool = require('../../config/mysql');
const { normalizeUploadPathsDeep } = require('../../utils/asset-url');

const searchAdminProducts = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
    const params = [];
    let whereClause = '';

    if (search) {
      whereClause = 'WHERE p.name LIKE ? OR p.slug LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug
       FROM products p
       ${whereClause}
       ORDER BY p.name ASC
       LIMIT ?`,
      [...params, limit]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error searching admin products:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const searchAdminVariants = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const productId = Number(req.query.productId || 0);
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 50);
    const params = [];
    const whereClauses = ['1=1'];

    if (productId > 0) {
      whereClauses.push('v.product_id = ?');
      params.push(productId);
    }

    if (search) {
      whereClauses.push('(v.name LIKE ? OR p.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT v.id, v.product_id, v.name, p.name as product_name
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY p.name ASC, v.name ASC
       LIMIT ?`,
      [...params, limit]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error searching admin variants:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getAdminProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let where = '';
    const params = [];
    if (search) {
      where = 'WHERE p.name LIKE ? OR p.slug LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, p.thumbnail, p.is_active, p.sold_count, p.created_at,
              p.seo_title, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [variantRows] = await pool.query(
      `SELECT id, product_id, name, price, stock_count, status
       FROM product_variants
       WHERE product_id IN (?)
       ORDER BY id ASC`,
      [rows.map((r) => r.id).length ? rows.map((r) => r.id) : [0]]
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM products p ${where}`, params);

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      thumbnail: p.thumbnail,
      is_active: !!p.is_active,
      sold_count: p.sold_count || 0,
      seo_title: p.seo_title,
      created_at: p.created_at,
      category: { name: p.category_name, slug: p.category_slug },
      variants: variantRows
        .filter((v) => Number(v.product_id) === Number(p.id))
        .map((v) => ({
          id: v.id,
          name: v.name,
          price: Number(v.price || 0),
          stock_count: Number(v.stock_count || 0),
          status: v.status || 'ACTIVE',
        })),
    }));

    return res.json({
      success: true,
      data: {
        products: normalizeUploadPathsDeep(products),
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getAdminProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const [variants] = await pool.query(
      `SELECT v.*, 
       (SELECT COUNT(*) FROM warehouse_items WHERE variant_id = v.id AND status = 'AVAILABLE') as auto_stock_count
       FROM product_variants v 
       WHERE v.product_id = ? 
       ORDER BY v.id ASC`,
      [id]
    );

    const product = rows[0];
    
    const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
    const seo_title = product.seo_title || product.name;
    const seo_description = product.seo_description || product.description;
    
    let parsedImages = [];
    if (typeof product.images === 'string') {
      try { parsedImages = JSON.parse(product.images); } catch(e) {}
    } else if (Array.isArray(product.images)) {
      parsedImages = product.images;
    }

    return res.json({
      success: true,
      data: normalizeUploadPathsDeep({
        ...product,
        seo_title: seo_title,
        seo_description: seo_description,
        seo_keywords: product.seo_keywords || '',
        canonical_url: product.canonical_url || `${baseUrl}/products/${product.slug}`,
        og_title: product.og_title || seo_title,
        og_description: product.og_description || seo_description,
        og_image: product.og_image || product.thumbnail || (parsedImages.length ? parsedImages[0] : ''),
        schema_brand: product.schema_brand || '',
        schema_sku: product.schema_sku || '',
        schema_gtin: product.schema_gtin || '',
        schema_mpn: product.schema_mpn || '',
        features: product.features ? (typeof product.features === 'string' ? JSON.parse(product.features) : product.features) : [],
        images: parsedImages,
        attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : [],
        variants: variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: Number(v.price || 0),
          cost_price: Number(v.cost_price || 0),
          stock_count: v.delivery_type === 'AUTO' ? Number(v.auto_stock_count || 0) : Number(v.stock_count || 0),
          status: v.status || 'ACTIVE',
          max_per_order: Number(v.max_per_order) > 0 ? Number(v.max_per_order) : 1,
          delivery_type: v.delivery_type === 'API' ? 'MANUAL' : (v.delivery_type || 'AUTO'),
          has_expiry: Number(v.has_expiry) === 1,
          expiry_days: Number(v.expiry_days || 0),
          allow_renewal: Number(v.allow_renewal) === 1,
          has_warranty: Number(v.has_warranty) === 1,
          warranty_days: Number(v.warranty_days || 0),
          guide_link: v.guide_link || '',
          required_inputs: v.required_inputs ? (typeof v.required_inputs === 'string' ? JSON.parse(v.required_inputs) : v.required_inputs) : [],
          attribute_values: typeof v.attribute_values === 'string' ? JSON.parse(v.attribute_values) : (v.attribute_values || {}),
        })),
      }),
    });
  } catch (error) {
    console.error('Error fetching admin product detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const createAdminProduct = async (req, res) => {
  const conn = await pool.getConnection();
  try {
      let {
        name,
        slug,
        category_id = null,
        thumbnail = '',
        description = '',
        tagline = '',
        internal_note = '',
        info_html = '',
        is_active = true,
        seo_title = '',
        seo_description = '',
        seo_keywords = '',
        canonical_url = '',
        og_title = '',
        og_description = '',
        og_image = '',
        schema_brand = '',
        schema_sku = '',
        schema_gtin = '',
        schema_mpn = '',
        features = [],
        attributes = [],
        images = [],
        variants = [],
        show_rating = true,
        show_sold_count = true,
      } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Thiếu tên hoặc slug sản phẩm' });
    }

    const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
    seo_title = seo_title || name;
    seo_description = seo_description || description;
    og_title = og_title || seo_title;
    og_description = og_description || seo_description;
    og_image = og_image || thumbnail || (images && images.length ? images[0] : '');
    canonical_url = canonical_url || `${baseUrl}/products/${slug}`;

    await conn.beginTransaction();

    const [exists] = await conn.query('SELECT id FROM products WHERE slug = ? LIMIT 1', [slug]);
    if (exists.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Slug sản phẩm đã tồn tại' });
    }

    const [insert] = await conn.query(
      `INSERT INTO products
      (name, slug, category_id, thumbnail, images, attributes, features, description, tagline, internal_note, info_html, is_active, show_rating, show_sold_count, seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, og_image, schema_brand, schema_sku, schema_gtin, schema_mpn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, category_id, thumbnail, JSON.stringify(images), JSON.stringify(attributes || []), JSON.stringify(features || []), description, tagline, internal_note, info_html, is_active ? 1 : 0, show_rating ? 1 : 0, show_sold_count ? 1 : 0, seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, og_image, schema_brand, schema_sku, schema_gtin, schema_mpn]
    );

    const productId = insert.insertId;

    if (Array.isArray(variants) && variants.length) {
      for (const variant of variants) {
        const priceCheck = {
          enabled: 0,
          notifyAdmin: 0,
          autoUpdate: 0,
          markupType: 'KEEP_MARGIN',
          markupValue: 0,
          config: null,
        };
        const [variantInsert] = await conn.query(
          `INSERT INTO product_variants (product_id, name, price, cost_price, stock_count, status, attribute_values, delivery_type, max_per_order, has_expiry, expiry_days, allow_renewal, required_inputs, api_config_ref, api_config, guide_link, price_check_enabled, price_check_notify_admin, price_check_auto_update, price_check_markup_type, price_check_markup_value, price_check_config, has_warranty, warranty_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId, 
            variant.name || 'Phân loại', 
            Number(variant.price || 0), 
            Number(variant.cost_price || 0),
            Number(variant.stock_count || 0), 
            variant.status || 'ACTIVE', 
            JSON.stringify(variant.attribute_values || {}),
            variant.delivery_type || 'AUTO',
            Number(variant.max_per_order) > 0 ? Number(variant.max_per_order) : 1,
            variant.has_expiry ? 1 : 0,
            Number(variant.expiry_days || 0),
            variant.has_expiry && variant.allow_renewal ? 1 : 0,
            JSON.stringify(variant.required_inputs || []),
            null,
            null,
            variant.guide_link || null,
            priceCheck.enabled,
            priceCheck.notifyAdmin,
            priceCheck.autoUpdate,
            priceCheck.markupType,
            priceCheck.markupValue,
            priceCheck.config,
            variant.has_warranty ? 1 : 0,
            Number(variant.warranty_days || 0)
          ]
        );

      }
    }

    await conn.commit();
    return res.json({ success: true, message: 'Tạo sản phẩm thành công', data: { id: insert.insertId } });
  } catch (error) {
    await conn.rollback();
    console.error('Error creating admin product:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const updateAdminProduct = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
      let {
        name,
        slug,
        category_id = null,
        thumbnail = '',
        description = '',
        tagline = '',
        internal_note = '',
        info_html = '',
        is_active = true,
        seo_title = '',
        seo_description = '',
        seo_keywords = '',
        canonical_url = '',
        og_title = '',
        og_description = '',
        og_image = '',
        schema_brand = '',
        schema_sku = '',
        schema_gtin = '',
        schema_mpn = '',
        features = [],
        attributes = [],
        images = [],
        variants = [],
        show_rating = true,
        show_sold_count = true,
      } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Thiếu tên hoặc slug sản phẩm' });
    }

    const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
    seo_title = seo_title || name;
    seo_description = seo_description || description;
    og_title = og_title || seo_title;
    og_description = og_description || seo_description;
    og_image = og_image || thumbnail || (images && images.length ? images[0] : '');
    canonical_url = canonical_url || `${baseUrl}/products/${slug}`;

    await conn.beginTransaction();

    const [exists] = await conn.query('SELECT id FROM products WHERE id = ? LIMIT 1', [id]);
    if (!exists.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const [slugExists] = await conn.query('SELECT id FROM products WHERE slug = ? AND id <> ? LIMIT 1', [slug, id]);
    if (slugExists.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Slug sản phẩm đã tồn tại' });
    }

     await conn.query(
      `UPDATE products SET
        name = ?, slug = ?, category_id = ?, thumbnail = ?, images = ?, attributes = ?, features = ?, description = ?, tagline = ?, internal_note = ?, info_html = ?, is_active = ?,
        show_rating = ?, show_sold_count = ?,
        seo_title = ?, seo_description = ?, seo_keywords = ?, canonical_url = ?, og_title = ?, og_description = ?, og_image = ?,
        schema_brand = ?, schema_sku = ?, schema_gtin = ?, schema_mpn = ?
        WHERE id = ?`,
      [
        name, slug, category_id, thumbnail, JSON.stringify(images), JSON.stringify(attributes || []), JSON.stringify(features || []), description, tagline, internal_note, info_html, is_active ? 1 : 0,
        show_rating ? 1 : 0, show_sold_count ? 1 : 0,
        seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, og_image,
        schema_brand, schema_sku, schema_gtin, schema_mpn, id,
      ]
    );

    if (req.body.hasOwnProperty('variants') && Array.isArray(variants)) {
      const [existingVariantRows] = await conn.query(
        'SELECT id, api_config_ref FROM product_variants WHERE product_id = ?',
        [id]
      );
      const existingVariantMap = new Map(
        existingVariantRows.map((row) => [Number(row.id), row])
      );

      const normalizeVariantId = (value) => {
        const numericId = Number(value);
        return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
      };

      const submittedVariantIds = new Set();
      for (const variant of variants) {
        const variantId = normalizeVariantId(variant?.id);
        if (!variantId) continue;

        if (!existingVariantMap.has(variantId)) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Biến thể không hợp lệ: ${variantId}`,
          });
        }

        if (submittedVariantIds.has(variantId)) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Biến thể bị gửi trùng: ${variantId}`,
          });
        }

        submittedVariantIds.add(variantId);
      }

      const removedVariantRows = existingVariantRows.filter(
        (row) => !submittedVariantIds.has(Number(row.id))
      );

      if (removedVariantRows.length) {
        const [referencedRows] = await conn.query(
          `SELECT DISTINCT variant_id
           FROM order_items
           WHERE variant_id IN (?)`,
          [removedVariantRows.map((row) => row.id)]
        );
        const referencedVariantIds = new Set(
          referencedRows.map((row) => Number(row.variant_id))
        );

        if (referencedVariantIds.size) {
          await conn.rollback();
          return res.status(409).json({
            success: false,
            message: 'Không thể xóa biến thể đã có trong đơn hàng. Hãy cập nhật biến thể hiện có thay vì xóa nó.',
            data: {
              referenced_variant_ids: Array.from(referencedVariantIds),
            },
          });
        }

        for (const removedVariant of removedVariantRows) {
          await conn.query('DELETE FROM product_variants WHERE id = ?', [removedVariant.id]);
        }
      }

      for (const variant of variants) {
        const priceCheck = {
          enabled: 0,
          notifyAdmin: 0,
          autoUpdate: 0,
          markupType: 'KEEP_MARGIN',
          markupValue: 0,
          config: null,
        };
        const variantPayload = [
          variant.name || 'Phân loại',
          Number(variant.price || 0),
          Number(variant.cost_price || 0),
          Number(variant.stock_count || 0),
          variant.status || 'ACTIVE',
          JSON.stringify(variant.attribute_values || {}),
          variant.delivery_type || 'AUTO',
          Number(variant.max_per_order) > 0 ? Number(variant.max_per_order) : 1,
          variant.has_expiry ? 1 : 0,
          Number(variant.expiry_days || 0),
          variant.has_expiry && variant.allow_renewal ? 1 : 0,
          JSON.stringify(variant.required_inputs || []),
          null,
          null,
          variant.guide_link || null,
          priceCheck.enabled,
          priceCheck.notifyAdmin,
          priceCheck.autoUpdate,
          priceCheck.markupType,
          priceCheck.markupValue,
          priceCheck.config,
          variant.has_warranty ? 1 : 0,
          Number(variant.warranty_days || 0),
        ];
        const existingVariantId = normalizeVariantId(variant?.id);

        if (existingVariantId) {
          await conn.query(
            `UPDATE product_variants SET
               name = ?, price = ?, cost_price = ?, stock_count = ?, status = ?,
               attribute_values = ?, delivery_type = ?, max_per_order = ?, has_expiry = ?, expiry_days = ?, allow_renewal = ?, required_inputs = ?, api_config_ref = NULL, api_config = NULL, guide_link = ?,
               price_check_enabled = ?, price_check_notify_admin = ?, price_check_auto_update = ?, price_check_markup_type = ?, price_check_markup_value = ?, price_check_config = ?, has_warranty = ?, warranty_days = ?
             WHERE id = ? AND product_id = ?`,
            [...variantPayload, existingVariantId, id]
          );

          continue;
        }

        const [variantInsert] = await conn.query(
          `INSERT INTO product_variants (product_id, name, price, cost_price, stock_count, status, attribute_values, delivery_type, max_per_order, has_expiry, expiry_days, allow_renewal, required_inputs, api_config_ref, api_config, guide_link, price_check_enabled, price_check_notify_admin, price_check_auto_update, price_check_markup_type, price_check_markup_value, price_check_config, has_warranty, warranty_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, ...variantPayload]
        );
      }
    }

    await conn.commit();
    return res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
  } catch (error) {
    await conn.rollback();
    console.error('Error updating admin product:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const addWarehouseItems = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách hàng hóa không hợp lệ' });
    }

    const values = items.map(item => [variantId, item, 'AVAILABLE']);
    await pool.query(
      'INSERT INTO warehouse_items (variant_id, item_data, status) VALUES ?',
      [values]
    );

    return res.json({ success: true, message: `Đã thêm ${items.length} mặt hàng vào kho` });
  } catch (error) {
    console.error('Error adding warehouse items:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getWarehouseItems = async (req, res) => {
  try {
    const { variantId } = req.params;
    const [rows] = await pool.query(
      'SELECT id, item_data, status FROM warehouse_items WHERE variant_id = ? AND status = "AVAILABLE" ORDER BY id DESC',
      [variantId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting warehouse items:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const deleteWarehouseItem = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM warehouse_items WHERE id = ? AND status = "AVAILABLE"', [id]);
    return res.json({ success: true, message: 'Đã xóa mặt hàng' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const createProductVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const variant = req.body;
    const priceCheck = {
    enabled: 0,
    notifyAdmin: 0,
    autoUpdate: 0,
    markupType: 'KEEP_MARGIN',
    markupValue: 0,
    config: null,
  };

    const [result] = await pool.query(
      `INSERT INTO product_variants (product_id, name, price, cost_price, stock_count, status, attribute_values, delivery_type, max_per_order, has_expiry, expiry_days, allow_renewal, required_inputs, api_config_ref, api_config, guide_link, price_check_enabled, price_check_notify_admin, price_check_auto_update, price_check_markup_type, price_check_markup_value, price_check_config, has_warranty, warranty_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        variant.name || 'Phân loại',
        Number(variant.price || 0),
        Number(variant.cost_price || 0),
        Number(variant.stock_count || 0),
        variant.status || 'ACTIVE',
        JSON.stringify(variant.attribute_values || {}),
        variant.delivery_type || 'AUTO',
        Number(variant.max_per_order) > 0 ? Number(variant.max_per_order) : 1,
        variant.has_expiry ? 1 : 0,
        Number(variant.expiry_days || 0),
        variant.has_expiry && variant.allow_renewal ? 1 : 0,
        JSON.stringify(variant.required_inputs || []),
        variant.guide_link || null,
        priceCheck.enabled,
        priceCheck.notifyAdmin,
        priceCheck.autoUpdate,
        priceCheck.markupType,
        priceCheck.markupValue,
        priceCheck.config,
        variant.has_warranty ? 1 : 0,
        Number(variant.warranty_days || 0)
      ]
    );

    return res.json({
      success: true,
      message: 'Tạo biến thể thành công',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating product variant:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const variant = req.body;

    const [existingRows] = await pool.query('SELECT product_id FROM product_variants WHERE id = ? LIMIT 1', [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biến thể' });
    }

    const priceCheck = {
      enabled: 0,
      notifyAdmin: 0,
      autoUpdate: 0,
      markupType: 'KEEP_MARGIN',
      markupValue: 0,
      config: null,
    };

    await pool.query(
      `UPDATE product_variants SET
       name = ?, price = ?, cost_price = ?, stock_count = ?, status = ?, 
       attribute_values = ?, delivery_type = ?, max_per_order = ?, has_expiry = ?, expiry_days = ?, allow_renewal = ?, required_inputs = ?, api_config_ref = NULL, api_config = NULL, guide_link = ?,
       price_check_enabled = ?, price_check_notify_admin = ?, price_check_auto_update = ?, price_check_markup_type = ?, price_check_markup_value = ?, price_check_config = ?, has_warranty = ?, warranty_days = ?
       WHERE id = ?`,
      [
        variant.name || 'Phân loại',
        Number(variant.price || 0),
        Number(variant.cost_price || 0),
        Number(variant.stock_count || 0),
        variant.status || 'ACTIVE',
        JSON.stringify(variant.attribute_values || {}),
        variant.delivery_type || 'AUTO',
        Number(variant.max_per_order) > 0 ? Number(variant.max_per_order) : 1,
        variant.has_expiry ? 1 : 0,
        Number(variant.expiry_days || 0),
        variant.has_expiry && variant.allow_renewal ? 1 : 0,
        JSON.stringify(variant.required_inputs || []),
        variant.guide_link || null,
        priceCheck.enabled,
        priceCheck.notifyAdmin,
        priceCheck.autoUpdate,
        priceCheck.markupType,
        priceCheck.markupValue,
        priceCheck.config,
        variant.has_warranty ? 1 : 0,
        Number(variant.warranty_days || 0),
        id
      ]
    );

    return res.json({ success: true, message: 'Cập nhật biến thể thành công' });
  } catch (error) {
    console.error('Error updating product variant:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const deleteProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [exists] = await pool.query('SELECT id FROM product_variants WHERE id = ?', [id]);
    if (!exists.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biến thể' });
    }

    await pool.query('DELETE FROM product_variants WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa biến thể' });
  } catch (error) {
    console.error('Error deleting product variant:', error);
    if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ success: false, message: 'Không thể xóa biến thể đã có trong đơn hàng.' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getAdminCategories = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, parent_id, icon, thumbnail, description, sort_order, is_active, created_at FROM categories ORDER BY parent_id ASC, sort_order ASC, name ASC'
    );

    const map = new Map();
    const tree = [];

    rows.forEach((row) => map.set(row.id, { ...row, children: [] }));
    rows.forEach((row) => {
      const node = map.get(row.id);
      if (row.parent_id && map.has(Number(row.parent_id))) {
        map.get(Number(row.parent_id)).children.push(node);
      } else if (!row.parent_id) {
        tree.push(node);
      }
    });

    return res.json({ success: true, data: normalizeUploadPathsDeep(tree) });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const createAdminCategory = async (req, res) => {
  try {
    const { name, slug, parent_id = null, icon = '', thumbnail = '', description = '', sort_order = 0, is_active = true } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Thiếu tên hoặc slug danh mục' });
    }

    const [exists] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
    if (exists.length) {
      return res.status(409).json({ success: false, message: 'Slug danh mục đã tồn tại' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, parent_id, icon, thumbnail, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, parent_id || null, icon, thumbnail, description, Number(sort_order || 0), is_active ? 1 : 0]
    );

    return res.json({ success: true, message: 'Tạo danh mục thành công', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating admin category:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parent_id = null, icon = '', thumbnail = '', description = '', sort_order = 0, is_active = true } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Thiếu tên hoặc slug danh mục' });
    }

    const [exists] = await pool.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [id]);
    if (!exists.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    const [slugExists] = await pool.query('SELECT id FROM categories WHERE slug = ? AND id <> ? LIMIT 1', [slug, id]);
    if (slugExists.length) {
      return res.status(409).json({ success: false, message: 'Slug danh mục đã tồn tại' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, slug = ?, parent_id = ?, icon = ?, thumbnail = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, slug, parent_id || null, icon, thumbnail, description, Number(sort_order || 0), is_active ? 1 : 0, id]
    );

    return res.json({ success: true, message: 'Cập nhật danh mục thành công' });
  } catch (error) {
    console.error('Error updating admin category:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const deleteAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [exists] = await pool.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [id]);
    if (!exists.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    const [products] = await pool.query('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
    if (products.length) {
      return res.status(409).json({ success: false, message: 'Danh mục đang được dùng bởi sản phẩm' });
    }

    const [children] = await pool.query('SELECT id FROM categories WHERE parent_id = ? LIMIT 1', [id]);
    if (children.length) {
      return res.status(409).json({ success: false, message: 'Danh mục đang có danh mục con' });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (error) {
    console.error('Error deleting admin category:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  searchAdminProducts,
  searchAdminVariants,
  getAdminProducts,
  getAdminProductDetail,
  createAdminProduct,
  updateAdminProduct,
  addWarehouseItems,
  getWarehouseItems,
  deleteWarehouseItem,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
};

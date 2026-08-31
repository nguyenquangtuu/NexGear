const pool = require('../config/mysql');
const { logActivity } = require('../services/log.service');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');

async function getProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const categorySlug = req.query.category;
    const search = req.query.q;

    let whereClause = 'WHERE p.is_active = 1';
    const queryParams = [];

    if (categorySlug) {
      whereClause += ' AND (c.slug = ? OR pc.slug = ?)';
      queryParams.push(categorySlug, categorySlug);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.tagline LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const seed = parseInt(req.query.seed);

    let orderBy = 'p.created_at DESC';
    // If no category or search is specified, and a seed is provided, use random ordering
    if (!categorySlug && !search && !isNaN(seed)) {
      orderBy = `RAND(${seed})`;
    }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      ${whereClause}
    `, queryParams);

    const [productsRows] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, c.parent_id as parent_category_id,
             c.description as category_description,
             pc.name as parent_category_name, pc.slug as parent_category_slug,
             pc.description as parent_category_description
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const [variantsRows] = await pool.query('SELECT * FROM product_variants');
    const [warehouseRows] = await pool.query("SELECT variant_id, COUNT(*) as count FROM warehouse_items WHERE status = 'AVAILABLE' GROUP BY variant_id");

    const warehouseCounts = {};
    warehouseRows.forEach(r => {
      warehouseCounts[r.variant_id] = r.count;
    });

    const products = productsRows.map((p) => {
      const vars = variantsRows
        .filter(v => v.product_id === p.id && v.status !== 'HIDDEN')
        .map(v => {
          let parsedInputs = [];
          if (typeof v.required_inputs === 'string') {
            try { parsedInputs = JSON.parse(v.required_inputs); } catch (e) {}
          } else if (Array.isArray(v.required_inputs)) {
            parsedInputs = v.required_inputs;
          }

          const dbDeliveryType = (v.delivery_type || 'AUTO').toUpperCase();
          let availableStock = v.stock_count;
          if (dbDeliveryType === 'AUTO') {
            availableStock = warehouseCounts[v.id] || 0;
          } else {
            availableStock = Number(v.stock_count || 0);
          }

          const deliveryType = dbDeliveryType === 'API' ? 'MANUAL' : dbDeliveryType;

          let parsedAttributeValues = {};
          if (typeof v.attribute_values === 'string') {
            try { parsedAttributeValues = JSON.parse(v.attribute_values); } catch (e) {}
          } else if (v.attribute_values && typeof v.attribute_values === 'object') {
            parsedAttributeValues = v.attribute_values;
          }

          delete parsedAttributeValues.ghi_chu;

          return {
            id: String(v.id),
            name: v.name,
            price: parseFloat(v.price),
            maxPerOrder: Number(v.max_per_order) > 0 ? Number(v.max_per_order) : 1,
            deliveryType,
            availableStock,
            hasExpiry: Number(v.has_expiry) === 1,
            expiryDays: Number(v.expiry_days || 0),
            allowRenewal: Number(v.allow_renewal) === 1,
            requiredInputs: parsedInputs,
            attribute_values: parsedAttributeValues
          };
        });

      let parsedImages = [];
      if (typeof p.images === 'string') {
        try { parsedImages = JSON.parse(p.images); } catch (e) {}
      } else if (Array.isArray(p.images)) {
        parsedImages = p.images;
      }

      return {
        id: p.id.toString(),
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        category: {
          id: p.category_id,
          name: p.category_name,
          slug: p.category_slug,
          description: p.category_description,
          parentId: p.parent_category_id,
          parentName: p.parent_category_name,
          parentSlug: p.parent_category_slug,
          parentDescription: p.parent_category_description
        },
        thumbnail: p.thumbnail,
        images: parsedImages,
        rating: p.show_rating !== 0 ? parseFloat(p.rating) : null,
        users: p.show_sold_count !== 0 ? p.users_count : null,
        infoHtml: p.info_html,
        badge: p.badge,
        features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || []),
        attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes || '[]') : (p.attributes || []),
        seo: {
          title: p.seo_title || p.name,
          description: p.seo_description || p.description,
          keywords: p.seo_keywords,
          canonicalUrl: p.canonical_url || `${process.env.FRONTEND_ORIGIN || 'https://vextro.vn'}/products/${p.slug}`,
          ogTitle: p.og_title || p.seo_title || p.name,
          ogDescription: p.og_description || p.seo_description || p.description,
          ogImage: p.og_image || p.thumbnail || (parsedImages.length ? parsedImages[0] : ''),
          schemaBrand: p.schema_brand,
          schemaSku: p.schema_sku,
          schemaGtin: p.schema_gtin,
          schemaMpn: p.schema_mpn,
        },
        variants: vars
      };
    });

    res.json({
      success: true,
      data: normalizeUploadPathsDeep(products),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    if (res.headersSent) {
      return;
    }

    res.status(500).json({ success: false, message: 'Lỗi server khi lấy sản phẩm' });
  }
}

async function getProductByIdentifier(req, res) {
  try {
    const { identifier } = req.params;
    const [productsRows] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, c.parent_id as parent_category_id,
             pc.name as parent_category_name, pc.slug as parent_category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE (p.slug = ? OR p.id = ?) AND p.is_active = 1 LIMIT 1
    `, [identifier, identifier]);
    
    if (!productsRows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    
    const p = productsRows[0];
    const [variantsRows] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [p.id]);
    const [warehouseRows] = await pool.query("SELECT variant_id, COUNT(*) as count FROM warehouse_items WHERE status = 'AVAILABLE' GROUP BY variant_id");
    
    const warehouseCounts = {};
    warehouseRows.forEach(r => warehouseCounts[r.variant_id] = r.count);
    
    const vars = variantsRows
      .filter(v => v.status !== 'HIDDEN')
      .map(v => {
      let parsedInputs = [];
      if (typeof v.required_inputs === 'string') {
        try { parsedInputs = JSON.parse(v.required_inputs); } catch(e) {}
      } else if (Array.isArray(v.required_inputs)) {
        parsedInputs = v.required_inputs;
      }

      const dbDeliveryType = (v.delivery_type || 'AUTO').toUpperCase();
      let availableStock = v.stock_count;
      if (dbDeliveryType === 'AUTO') {
        availableStock = warehouseCounts[v.id] || 0;
      } else {
        availableStock = Number(v.stock_count || 0);
      }

      const deliveryType = dbDeliveryType === 'API' ? 'MANUAL' : dbDeliveryType;

      let parsedAttrValues = {};
      if (typeof v.attribute_values === 'string') {
        try { parsedAttrValues = JSON.parse(v.attribute_values); } catch(e) {}
      } else if (v.attribute_values && typeof v.attribute_values === 'object') {
        parsedAttrValues = v.attribute_values;
      }

      delete parsedAttrValues.ghi_chu;

      return {
        id: String(v.id),
        name: v.name,
        price: parseFloat(v.price),
        maxPerOrder: Number(v.max_per_order) > 0 ? Number(v.max_per_order) : 1,
        deliveryType,
        availableStock,
        hasExpiry: Number(v.has_expiry) === 1,
        expiryDays: Number(v.expiry_days || 0),
        allowRenewal: Number(v.allow_renewal) === 1,
        requiredInputs: parsedInputs,
        attribute_values: parsedAttrValues
      };
    });

    let parsedImages = [];
    if (typeof p.images === 'string') {
      try { parsedImages = JSON.parse(p.images); } catch(e) {}
    } else if (Array.isArray(p.images)) {
      parsedImages = p.images;
    }

    const product = {
      id: p.id.toString(),
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      category: {
        id: p.category_id,
        name: p.category_name,
        slug: p.category_slug,
        parentId: p.parent_category_id,
        parentName: p.parent_category_name,
        parentSlug: p.parent_category_slug
      },
      thumbnail: p.thumbnail,
      images: parsedImages,
      infoHtml: p.info_html,
      deliveryType: p.delivery_type,
      badge: p.badge,
      rating: p.show_rating !== 0 ? parseFloat(p.rating) : null,
      users: p.show_sold_count !== 0 ? p.users_count : null,
      features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || []),
      attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes || '[]') : (p.attributes || []),
      seo: {
        title: p.seo_title || p.name,
        description: p.seo_description || p.description,
        keywords: p.seo_keywords,
        canonicalUrl: p.canonical_url || `${process.env.FRONTEND_ORIGIN || 'https://vextro.vn'}/products/${p.slug}`,
        ogTitle: p.og_title || p.seo_title || p.name,
        ogDescription: p.og_description || p.seo_description || p.description,
        ogImage: p.og_image || p.thumbnail || (parsedImages.length ? parsedImages[0] : ''),
        schemaBrand: p.schema_brand,
        schemaSku: p.schema_sku,
        schemaGtin: p.schema_gtin,
        schemaMpn: p.schema_mpn,
      },
      variants: vars
    };

    // Log product view to MongoDB (async, non-blocking)
    logActivity({
      user_id: req.session?.user?.id || null,
      email: req.session?.user?.email || null,
      action: 'VIEW_PRODUCT',
      target_id: String(p.id),
      target_type: 'PRODUCT',
      description: `User viewed product: ${p.name}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      meta: { productSlug: identifier, productName: p.name }
    }).catch(err => console.error('Failed to log product view:', err.message));

    res.json({ success: true, data: normalizeUploadPathsDeep(product) });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy sản phẩm' });
  }
}

async function getProductsByIds(req, res) {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ success: true, data: [] });
    }

    const idList = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (idList.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const [productsRows] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, c.parent_id as parent_category_id,
             pc.name as parent_category_name, pc.slug as parent_category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE p.id IN (?) AND p.is_active = 1
    `, [idList]);

    const [variantsRows] = await pool.query('SELECT * FROM product_variants WHERE product_id IN (?)', [idList]);
    const [warehouseRows] = await pool.query("SELECT variant_id, COUNT(*) as count FROM warehouse_items WHERE status = 'AVAILABLE' AND variant_id IN (SELECT id FROM product_variants WHERE product_id IN (?)) GROUP BY variant_id", [idList]);
    
    const warehouseCounts = {};
    warehouseRows.forEach(r => warehouseCounts[r.variant_id] = r.count);

    const products = productsRows.map(p => {
      const vars = variantsRows.filter(v => v.product_id === p.id).map(v => {
        const dbDeliveryType = (v.delivery_type || 'AUTO').toUpperCase();
        let availableStock = v.stock_count;
        if (dbDeliveryType === 'AUTO') {
          availableStock = warehouseCounts[v.id] || 0;
        } else if (dbDeliveryType === 'API') {
          availableStock = 999999;
        }

        // Hide 'API' from customer, show as 'AUTO'
        const deliveryType = dbDeliveryType === 'API' ? 'AUTO' : dbDeliveryType;

        const attributeValues = v.attribute_values
          ? (typeof v.attribute_values === 'string' ? JSON.parse(v.attribute_values) : v.attribute_values)
          : {};
        delete attributeValues.ghi_chu;

        return {
          id: String(v.id),
          name: v.name,
          price: parseFloat(v.price),
          deliveryType,
          availableStock,
          maxPerOrder: Number(v.max_per_order) > 0 ? Number(v.max_per_order) : 1,
          hasExpiry: Number(v.has_expiry) === 1,
          expiryDays: Number(v.expiry_days || 0),
          allowRenewal: Number(v.allow_renewal) === 1,
          attribute_values: attributeValues
        };
      });

      return {
        id: p.id.toString(),
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.thumbnail,
        rating: p.show_rating !== 0 ? parseFloat(p.rating) : null,
        users: p.show_sold_count !== 0 ? p.users_count : null,
        badge: p.badge,
        variants: vars
      };
    });

    res.json({ success: true, data: normalizeUploadPathsDeep(products) });
  } catch (error) {
    console.error('Error fetching products by ids:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy sản phẩm' });
  }
}

module.exports = {
  getProducts,
  getProductByIdentifier,
  getProductsByIds
};

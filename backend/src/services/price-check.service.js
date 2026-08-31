const axios = require('axios');
const pool = require('../config/mysql');
const ApiVariable = require('../models/apiVariable.model');
const { createNotification, writeLog } = require('./log.service');
const { sendAdminZaloBotNotification } = require('./zalo-bot.service');

function normalizePriceCheckConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const normalized = {
    url: String(input.url || '').trim(),
    method: String(input.method || 'GET').trim().toUpperCase(),
    headers:
      input.headers && typeof input.headers === 'object' && !Array.isArray(input.headers)
        ? input.headers
        : {},
    body: input.body ?? {},
    success_mapping: String(input.success_mapping || '').trim(),
    price_mapping: String(input.price_mapping || '').trim(),
  };

  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized.method)) {
    normalized.method = 'GET';
  }

  return normalized.url && normalized.price_mapping ? normalized : null;
}

function parseJsonMaybe(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function getByPath(input, path) {
  if (!path) return undefined;
  return String(path)
    .replace(/\[\]/g, '.0')
    .split('.')
    .filter(Boolean)
    .reduce((obj, key) => {
      if (obj === undefined || obj === null) return undefined;
      return obj[key];
    }, input);
}

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value.trim().replace(/[^\d,.-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    normalized = cleaned
      .replace(new RegExp(`\\${decimalSeparator === ',' ? '.' : ','}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? ',' : '.';
    const parts = cleaned.split(separator);
    const looksLikeThousands = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
    normalized = looksLikeThousands ? parts.join('') : cleaned.replace(separator, '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function calculateSellingPrice({ oldCost, oldPrice, newCost, markupType, markupValue }) {
  const type = ['KEEP_MARGIN', 'AMOUNT', 'PERCENT'].includes(markupType) ? markupType : 'KEEP_MARGIN';
  const value = Number(markupValue || 0);

  if (type === 'AMOUNT') return Math.max(0, Math.round(newCost + value));
  if (type === 'PERCENT') return Math.max(0, Math.round(newCost * (1 + value / 100)));

  const margin = Math.max(0, Number(oldPrice || 0) - Number(oldCost || 0));
  return Math.max(0, Math.round(newCost + margin));
}

async function getGlobalVariables() {
  const variables = await ApiVariable.find({ is_active: true }).lean();
  return variables.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

function buildReplaceVars({ variant, globals }) {
  return (value) => {
    if (typeof value !== 'string') return value;
    let result = value
      .replace(/\{\{productId\}\}/g, String(variant.product_id || ''))
      .replace(/\{\{variantId\}\}/g, String(variant.id || ''))
      .replace(/\{\{variantName\}\}/g, String(variant.name || ''))
      .replace(/\{\{productSlug\}\}/g, String(variant.product_slug || ''))
      .replace(/\{\{currentCost\}\}/g, String(Number(variant.cost_price || 0)))
      .replace(/\{\{currentPrice\}\}/g, String(Number(variant.price || 0)));

    Object.keys(globals).forEach((key) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), globals[key]);
    });

    return result;
  };
}

async function callPriceApi(variant, config) {
  const globals = await getGlobalVariables();
  const replaceVars = buildReplaceVars({ variant, globals });
  const requestConfig = {
    method: config.method || 'GET',
    url: replaceVars(config.url),
    headers: JSON.parse(replaceVars(JSON.stringify(config.headers || {}))),
    timeout: 30000,
  };

  if (config.body) {
    if (typeof config.body === 'string') {
      requestConfig.data = replaceVars(config.body);
      try {
        requestConfig.data = JSON.parse(requestConfig.data);
      } catch (_error) {}
    } else {
      requestConfig.data = JSON.parse(replaceVars(JSON.stringify(config.body)));
    }
  }

  const response = await axios(requestConfig);
  const data = response.data;

  if (config.success_mapping) {
    const parts = config.success_mapping.split('===');
    const path = parts[0].trim();
    const expected = parts[1]?.trim().replace(/['"]/g, '');
    const actual = getByPath(data, path);
    const isSuccess = expected !== undefined ? String(actual) === expected : !!actual;
    if (!isSuccess) {
      const error = new Error('API check giá trả về trạng thái không thành công');
      error.responseData = data;
      throw error;
    }
  }

  const rawPrice = getByPath(data, config.price_mapping);
  const newCost = parseMoney(rawPrice);
  if (newCost === null || newCost < 0) {
    const error = new Error('Không đọc được giá vốn mới từ response API');
    error.responseData = data;
    throw error;
  }

  return { newCost, responseData: data };
}

async function getAdminRecipients() {
  const [admins] = await pool.query('SELECT id, email FROM users WHERE role = "ADMIN"');
  return admins;
}

async function createAdminNotifications(title, message, data) {
  const admins = await getAdminRecipients();
  if (!admins.length) return;

  await Promise.allSettled(
    admins.map((admin) =>
      createNotification({
        user_id: admin.id,
        email: admin.email,
        type: 'SYSTEM_ANNOUNCEMENT',
        title,
        message,
        data,
      })
    )
  );
}

async function notifyPriceChange(change) {
  const title = 'Giá vốn sản phẩm thay đổi';
  const messageLines = [
    `${change.product_name} - ${change.variant_name}`,
    `Giá vốn: ${formatMoney(change.old_cost)} -> ${formatMoney(change.new_cost)}`,
    change.auto_updated
      ? `Giá bán đã cập nhật: ${formatMoney(change.old_price)} -> ${formatMoney(change.new_price)}`
      : 'Giá bán chưa tự cập nhật do cấu hình auto update đang tắt',
    change.product_disabled
      ? 'Sản phẩm đã được tự động tắt để admin kiểm tra lại trước khi bán tiếp.'
      : 'Giá đã được tự động cập nhật, sản phẩm vẫn đang mở bán.',
  ];
  const message = messageLines.join('\n');

  await Promise.allSettled([
    createAdminNotifications(title, message, {
      event: 'PRODUCT_PRICE_CHANGED',
      productId: change.product_id,
      variantId: change.variant_id,
      oldCost: change.old_cost,
      newCost: change.new_cost,
      oldPrice: change.old_price,
      newPrice: change.new_price,
      autoUpdated: change.auto_updated,
      productDisabled: change.product_disabled,
    }),
    sendAdminZaloBotNotification(title, message),
  ]);
}

async function notifyPriceFailure(failure) {
  const title = 'Lỗi lấy giá vốn sản phẩm';
  const messageLines = [
    `${failure.product_name} - ${failure.variant_name}`,
    `Ngữ cảnh: ${failure.context === 'checkout' ? 'Check trước mua hàng' : 'Job nền check giá'}`,
    `Lỗi: ${failure.reason}`,
    failure.variant_hidden
      ? 'Phân loại đã được tự động chuyển sang Ẩn để tránh khách mua nhầm.'
      : 'Phân loại chưa được chuyển sang Ẩn.',
  ];
  const message = messageLines.join('\n');

  await Promise.allSettled([
    createAdminNotifications(title, message, {
      event: 'PRODUCT_PRICE_CHECK_FAILED',
      productId: failure.product_id,
      variantId: failure.variant_id,
      reason: failure.reason,
      context: failure.context,
      variantHidden: failure.variant_hidden,
    }),
    sendAdminZaloBotNotification(title, message),
  ]);
}

async function hideVariantAfterPriceError(conn, variant) {
  const [result] = await conn.query(
    `UPDATE product_variants
     SET status = 'HIDDEN',
         price_check_last_checked_at = NOW()
     WHERE id = ?`,
    [variant.id]
  );

  return result.affectedRows > 0;
}

async function disableProductAfterPriceChange(conn, variant) {
  const [result] = await conn.query(
    `UPDATE products
     SET is_active = 0
     WHERE id = ?`,
    [variant.product_id]
  );

  return result.affectedRows > 0;
}

async function checkVariantPrice(variantId, options = {}) {
  const conn = options.conn || pool;
  const context = String(options.context || 'scheduled');
  const [rows] = await conn.query(
    `SELECT v.*, p.name AS product_name, p.slug AS product_slug, p.is_active AS product_is_active
     FROM product_variants v
     INNER JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     LIMIT 1`,
    [variantId]
  );

  if (!rows.length) {
    const error = new Error('Không tìm thấy phân loại');
    error.statusCode = 404;
    throw error;
  }

  const variant = rows[0];
  const config = normalizePriceCheckConfig(parseJsonMaybe(variant.price_check_config));
  if (!config) {
    return {
      variantId: Number(variant.id),
      checked: false,
      changed: false,
      message: 'Phân loại chưa có cấu hình API check giá hợp lệ',
    };
  }

  let apiResult;
  try {
    apiResult = await callPriceApi(variant, config);
  } catch (error) {
    const hidden = await hideVariantAfterPriceError(conn, variant);
    const failure = {
      product_id: Number(variant.product_id),
      variant_id: Number(variant.id),
      product_name: variant.product_name,
      variant_name: variant.name,
      reason: error.message,
      context,
      variant_hidden: hidden,
    };

    await Promise.allSettled([
      writeLog({
        level: 'error',
        action: 'price_check_failed',
        message: error.message,
        meta: {
          variantId: Number(variant.id),
          productId: Number(variant.product_id),
          context,
          responseData: error.responseData || null,
          variantHidden: hidden,
        },
      }),
      notifyPriceFailure(failure),
    ]);

    error.statusCode = error.statusCode || 409;
    error.variantHidden = hidden;
    error.userMessage =
      'Không thể xác minh giá của phân loại này. Hệ thống đã tự chuyển phân loại sang Ẩn để tránh mua nhầm.';
    throw error;
  }

  const { newCost } = apiResult;
  const oldCost = Number(variant.cost_price || 0);
  const oldPrice = Number(variant.price || 0);
  const previousObservedCost =
    variant.price_check_last_cost === null || variant.price_check_last_cost === undefined
      ? null
      : Number(variant.price_check_last_cost);
  const costChanged = Math.round(newCost) !== Math.round(oldCost);
  const observedChanged =
    previousObservedCost === null || Math.round(previousObservedCost) !== Math.round(newCost);
  const autoUpdate = Number(variant.price_check_auto_update) === 1;
  const newPrice = costChanged
    ? calculateSellingPrice({
        oldCost,
        oldPrice,
        newCost,
        markupType: variant.price_check_markup_type,
        markupValue: variant.price_check_markup_value,
      })
    : oldPrice;
  const autoUpdated = costChanged && autoUpdate;

  if (autoUpdated) {
    await conn.query(
      `UPDATE product_variants
       SET cost_price = ?, price = ?, price_check_last_cost = ?, price_check_last_checked_at = NOW(), price_check_last_changed_at = NOW()
       WHERE id = ?`,
      [newCost, newPrice, newCost, variant.id]
    );
  } else {
    await conn.query(
      `UPDATE product_variants
       SET price_check_last_cost = ?, price_check_last_checked_at = NOW(), price_check_last_changed_at = CASE WHEN ? THEN NOW() ELSE price_check_last_changed_at END
       WHERE id = ?`,
      [newCost, costChanged ? 1 : 0, variant.id]
    );
  }

  let productDisabled = false;
  if (costChanged && !autoUpdate) {
    productDisabled = await disableProductAfterPriceChange(conn, variant);
  }

  const change = {
    product_id: Number(variant.product_id),
    variant_id: Number(variant.id),
    product_name: variant.product_name,
    variant_name: variant.name,
    old_cost: oldCost,
    new_cost: newCost,
    old_price: oldPrice,
    new_price: newPrice,
    auto_updated: autoUpdated,
    product_disabled: productDisabled,
  };

  if (costChanged && observedChanged) {
    await notifyPriceChange(change);
  }

  return {
    variantId: Number(variant.id),
    checked: true,
    changed: costChanged,
    observedChanged,
    autoUpdated,
    oldCost,
    newCost,
    oldPrice,
    newPrice,
    productDisabled,
  };
}

async function runEnabledPriceChecks() {
  const [rows] = await pool.query(
    `SELECT v.id
     FROM product_variants v
     INNER JOIN products p ON p.id = v.product_id
     WHERE v.price_check_enabled = 1
       AND v.price_check_config IS NOT NULL
       AND v.status <> 'HIDDEN'
       AND p.is_active = 1`
  );

  const results = [];
  for (const row of rows) {
    try {
      results.push(await checkVariantPrice(row.id, { context: 'scheduled' }));
    } catch (error) {
      results.push({
        variantId: Number(row.id),
        checked: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  normalizePriceCheckConfig,
  checkVariantPrice,
  runEnabledPriceChecks,
};

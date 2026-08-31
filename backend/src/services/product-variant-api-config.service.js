const ProductVariantApiConfig = require('../models/productVariantApiConfig.model');

function normalizeApiConfig(input) {
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
    value_mapping: String(input.value_mapping || '').trim(),
  };

  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized.method)) {
    normalized.method = 'GET';
  }

  const hasMeaningfulValue =
    normalized.url ||
    Object.keys(normalized.headers).length > 0 ||
    (typeof normalized.body === 'string'
      ? normalized.body.trim()
      : normalized.body && typeof normalized.body === 'object'
        ? Object.keys(normalized.body).length > 0
        : Boolean(normalized.body)) ||
    normalized.success_mapping ||
    normalized.value_mapping;

  return hasMeaningfulValue ? normalized : null;
}

async function getVariantApiConfigById(id) {
  if (!id) return null;
  const doc = await ProductVariantApiConfig.findById(id).lean();
  if (!doc) return null;

  return {
    id: String(doc._id),
    url: doc.url || '',
    method: doc.method || 'GET',
    headers: doc.headers || {},
    body: doc.body ?? {},
    success_mapping: doc.success_mapping || '',
    value_mapping: doc.value_mapping || '',
  };
}

async function getVariantApiConfigsMap(ids = []) {
  const uniqueIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const docs = await ProductVariantApiConfig.find({ _id: { $in: uniqueIds } }).lean();
  return new Map(
    docs.map((doc) => [
      String(doc._id),
      {
        id: String(doc._id),
        url: doc.url || '',
        method: doc.method || 'GET',
        headers: doc.headers || {},
        body: doc.body ?? {},
        success_mapping: doc.success_mapping || '',
        value_mapping: doc.value_mapping || '',
      },
    ])
  );
}

async function upsertVariantApiConfig({
  existingId = null,
  productId,
  variantId,
  apiConfig,
  actorId = null,
}) {
  const normalized = normalizeApiConfig(apiConfig);

  if (!normalized) {
    if (existingId) {
      await ProductVariantApiConfig.findByIdAndDelete(existingId);
    }
    return null;
  }

  if (existingId) {
    const updated = await ProductVariantApiConfig.findByIdAndUpdate(
      existingId,
      {
        $set: {
          product_id: String(productId),
          variant_id: String(variantId),
          ...normalized,
          updated_by_id: actorId ? String(actorId) : null,
        },
      },
      { new: true, upsert: true }
    ).lean();
    return String(updated._id);
  }

  const created = await ProductVariantApiConfig.create({
    product_id: String(productId),
    variant_id: String(variantId),
    ...normalized,
    created_by_id: actorId ? String(actorId) : null,
    updated_by_id: actorId ? String(actorId) : null,
  });

  return String(created._id);
}

async function deleteVariantApiConfig(id) {
  if (!id) return;
  await ProductVariantApiConfig.findByIdAndDelete(id);
}

module.exports = {
  normalizeApiConfig,
  getVariantApiConfigById,
  getVariantApiConfigsMap,
  upsertVariantApiConfig,
  deleteVariantApiConfig,
};

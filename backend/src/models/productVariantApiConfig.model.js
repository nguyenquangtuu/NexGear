const mongoose = require('mongoose');

const productVariantApiConfigSchema = new mongoose.Schema(
  {
    variant_id: { type: String, required: true, index: true },
    product_id: { type: String, required: true, index: true },
    url: { type: String, default: '' },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
    headers: { type: mongoose.Schema.Types.Mixed, default: {} },
    body: { type: mongoose.Schema.Types.Mixed, default: {} },
    success_mapping: { type: String, default: '' },
    value_mapping: { type: String, default: '' },
    created_by_id: { type: String, default: null },
    updated_by_id: { type: String, default: null },
  },
  { timestamps: true }
);

productVariantApiConfigSchema.index({ product_id: 1, variant_id: 1 });

module.exports = mongoose.model('ProductVariantApiConfig', productVariantApiConfigSchema);

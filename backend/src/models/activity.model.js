const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user_id: { type: String, required: false }, // Use String because MySQL IDs are BIGINT, and it can be null for guests
    email: { type: String, required: false },
    ip_address: { type: String },
    user_agent: { type: String },
    action: { type: String, required: true },
    target_id: { type: String }, // ID of the product, order, etc.
    target_type: { type: String }, // 'PRODUCT', 'ORDER', 'TRANSACTION', etc.
    description: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Indexes for fast searching
activitySchema.index({ user_id: 1, created_at: -1 });
activitySchema.index({ action: 1, created_at: -1 });
activitySchema.index({ target_type: 1, target_id: 1 });

module.exports = mongoose.model('ActivityLog', activitySchema);

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    email: { type: String, required: false },
    type: {
      type: String,
      required: true,
      enum: [
        'ORDER_SUCCESS',
        'ORDER_COMPLETED',
        'ORDER_CANCELLED',
        'DEPOSIT_SUCCESS',
        'BALANCE_ADJUSTED',
        'ACCOUNT_BLOCKED',
        'ACCOUNT_UNBLOCKED',
        'REVIEW_RECEIVED',
        'LOGIN_SUCCESS',
        'SYSTEM_ANNOUNCEMENT',
        'SERVICE_RENEWAL_REMINDER',
        'SERVICE_EXPIRED'
      ]
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

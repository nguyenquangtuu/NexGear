const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    user_email: { type: String, default: null },
    user_name: { type: String, default: null },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    },
    last_message: { type: String, default: '' },
    last_sender_role: { type: String, enum: ['USER', 'ADMIN', 'AI'], default: 'USER' },
    last_message_at: { type: Date, default: Date.now },
    admin_unread_count: { type: Number, default: 0 },
    user_unread_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

chatConversationSchema.index({ last_message_at: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);

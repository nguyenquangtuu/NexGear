const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    sender_id: { type: String, required: true },
    sender_role: { type: String, enum: ['USER', 'ADMIN', 'AI'], required: true },
    sender_name: { type: String, default: null },
    content: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation_id: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

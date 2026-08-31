const mongoose = require('mongoose');

const DEFAULT_SYSTEM_PROMPT =
  'Ban la tro ly CSKH cua Vextro. Muc tieu la tu van san pham tren website, ho tro cac van de co ban, tra loi ngan gon, ro rang, lich su. Neu chua du thong tin, hay hoi lai 1-2 cau hoi de lam ro va huong dan lien he admin.';

const chatAiConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    auto_reply_enabled: { type: Boolean, default: true },
    system_prompt: { type: String, default: DEFAULT_SYSTEM_PROMPT },
    training_instructions: { type: String, default: '' },
    updated_by_id: { type: String, default: null },
    updated_by_name: { type: String, default: null },
  },
  { timestamps: true }
);

chatAiConfigSchema.statics.getDefaultConfig = function getDefaultConfig() {
  return this.findOneAndUpdate(
    { key: 'default' },
    {
      $setOnInsert: {
        auto_reply_enabled: true,
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        training_instructions: '',
      },
    },
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model('ChatAiConfig', chatAiConfigSchema);

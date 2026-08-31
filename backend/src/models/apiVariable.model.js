const mongoose = require('mongoose');

const apiVariableSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    created_by_id: { type: String, default: null },
    updated_by_id: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiVariable', apiVariableSchema);

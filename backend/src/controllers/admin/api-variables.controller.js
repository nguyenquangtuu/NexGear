const ApiVariable = require('../../models/apiVariable.model');

const getAllVariables = async (req, res) => {
  try {
    const variables = await ApiVariable.find().sort({ key: 1 });
    res.json({ success: true, data: variables });
  } catch (error) {
    console.error('Get API variables error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
};

const createVariable = async (req, res) => {
  try {
    const { key, value, description, is_active } = req.body;

    if (!key || !value) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin key hoặc value' });
    }

    const existing = await ApiVariable.findOne({ key });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Key này đã tồn tại' });
    }

    const variable = await ApiVariable.create({
      key: key.trim().toUpperCase(),
      value,
      description,
      is_active: is_active !== false,
      created_by_id: req.user?.id,
      updated_by_id: req.user?.id,
    });

    res.json({ success: true, data: variable });
  } catch (error) {
    console.error('Create API variable error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
};

const updateVariable = async (req, res) => {
  try {
    const { id } = req.params;
    const { key, value, description, is_active } = req.body;

    const variable = await ApiVariable.findById(id);
    if (!variable) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biến' });
    }

    if (key && key.trim().toUpperCase() !== variable.key) {
      const existing = await ApiVariable.findOne({ key: key.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Key này đã tồn tại' });
      }
      variable.key = key.trim().toUpperCase();
    }

    if (value !== undefined) variable.value = value;
    if (description !== undefined) variable.description = description;
    if (is_active !== undefined) variable.is_active = is_active;
    variable.updated_by_id = req.user?.id;

    await variable.save();
    res.json({ success: true, data: variable });
  } catch (error) {
    console.error('Update API variable error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
};

const deleteVariable = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ApiVariable.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biến' });
    }
    res.json({ success: true, message: 'Đã xóa biến' });
  } catch (error) {
    console.error('Delete API variable error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
};

module.exports = {
  getAllVariables,
  createVariable,
  updateVariable,
  deleteVariable,
};

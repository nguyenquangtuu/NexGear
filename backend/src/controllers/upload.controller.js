const fs = require('fs');
const path = require('path');

const uploadBase64 = async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh' });
    }

    // data:image/png;base64,.....
    const base64Content = base64Data.split(';base64,').pop();
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Ensure filename is safe (basic)
    const safeName = (fileName || `upload_${Date.now()}.png`).replace(/[^a-z0-9.]/gi, '_');
    const uniqueName = `${Date.now()}_${safeName}`;
    
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    // Create dir if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/api/uploads/${uniqueName}`;
    
    return res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Upload base64 error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi upload ảnh' });
  }
};

module.exports = { uploadBase64 };

const express = require('express');
const { uploadBase64 } = require('../controllers/upload.controller');
const router = express.Router();

router.post('/base64', uploadBase64);

module.exports = router;

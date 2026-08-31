const express = require('express');
const { getPublicHomeBanners } = require('../controllers/homeBanners.controller');

const router = express.Router();

router.get('/', getPublicHomeBanners);

module.exports = router;

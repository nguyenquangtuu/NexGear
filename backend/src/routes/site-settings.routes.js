const express = require('express');
const { getPublicSiteSettings } = require('../controllers/siteSettings.controller');

const router = express.Router();

router.get('/', getPublicSiteSettings);

module.exports = router;

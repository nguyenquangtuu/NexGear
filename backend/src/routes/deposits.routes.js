const express = require('express');
const router = express.BoxRouter ? express.BoxRouter() : express.Router();
const depositsController = require('../controllers/deposits.controller');

const { requireAuth } = require('../middlewares/auth.middleware');

// router.post('/webhook/sepay', depositsController.receiveSepayWebhook); // Handled in app.js
router.get('/history', requireAuth, depositsController.getDepositHistory);

module.exports = router;

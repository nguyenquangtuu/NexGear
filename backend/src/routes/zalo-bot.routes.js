const express = require('express');
const { body } = require('express-validator');
const zaloBotController = require('../controllers/zalo-bot.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/webhook', zaloBotController.webhook);
router.get('/webhook', (req, res) => res.json({ success: true, message: 'Zalo Bot Webhook endpoint is active' }));

router.get('/status', requireAuth, zaloBotController.getStatus);
router.post('/link-code', requireAuth, zaloBotController.createLinkCode);
router.put(
  '/preferences',
  requireAuth,
  [body('enabled').isBoolean().withMessage('enabled phải là giá trị boolean')],
  zaloBotController.updatePreferences
);
router.delete('/link', requireAuth, zaloBotController.unlink);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizePusherChannel } = require('../controllers/realtime.controller');

const router = express.Router();

router.post('/pusher/auth', requireAuth, authorizePusherChannel);

module.exports = router;

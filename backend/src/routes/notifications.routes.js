const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.put('/:notificationId/read', notificationsController.markAsRead);
router.put('/read-all', notificationsController.markAsRead);
router.delete('/:notificationId', notificationsController.deleteNotification);

module.exports = router;

const express = require('express');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/my', chatController.getMyConversation);
router.post('/my/messages', chatController.sendMyMessage);
router.put('/my/read', chatController.markMyConversationRead);

router.get('/admin/conversations', requireAdmin, chatController.getAdminConversations);
router.get('/admin/conversations/:conversationId/messages', requireAdmin, chatController.getAdminConversationMessages);
router.post('/admin/conversations/:conversationId/messages', requireAdmin, chatController.sendAdminMessage);
router.put('/admin/conversations/:conversationId/read', requireAdmin, chatController.markAdminConversationRead);
router.get('/admin/ai-config', requireAdmin, chatController.getAdminAiConfig);
router.put('/admin/ai-config', requireAdmin, chatController.updateAdminAiConfig);

module.exports = router;

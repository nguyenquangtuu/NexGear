const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Public routes
router.get('/public', postsController.getAllPublic);
router.get('/slug/:slug', postsController.getBySlug);

// Admin routes
router.get('/admin', requireAdmin, postsController.getAllAdmin);
router.get('/:id', requireAdmin, postsController.getById);
router.post('/', requireAdmin, postsController.create);
router.put('/:id', requireAdmin, postsController.update);
router.delete('/:id', requireAdmin, postsController.delete);

module.exports = router;

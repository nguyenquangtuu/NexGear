const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middlewares/auth.middleware');
const {
  createOrder,
  previewDiscount,
  getMyOrders,
  getMyServices,
  renewService,
  submitReview,
  syncOrderPaymentStatus,
} = require('../controllers/orders.controller');

const { reviewLimiter, reviewGlobalLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

router.post(
  '/preview-discount',
  requireAuth,
  [
    body('variantId').notEmpty().withMessage('variantId khong hop le'),
    body('quantity').notEmpty().withMessage('quantity khong hop le'),
    body('discountCode').optional().isString().trim(),
    body('deliveryMethod').optional().isIn(['DELIVERY', 'PICKUP']).withMessage('deliveryMethod khong hop le'),
  ],
  previewDiscount
);

router.post(
  '/',
  requireAuth,
  [
    body('variantId').isInt({ min: 1 }).withMessage('variantId khong hop le'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity khong hop le'),
    body('requiredInputs').optional().isObject().withMessage('requiredInputs khong hop le'),
    body('discountCode').optional().isString().trim(),
    body('deliveryMethod').optional().isIn(['DELIVERY', 'PICKUP']).withMessage('deliveryMethod khong hop le'),
    body('pickupStore').optional().isString().trim(),
    body('shippingName').optional().isString().trim(),
    body('shippingPhone').optional().isString().trim(),
    body('shippingAddress').optional().isString().trim(),
    body('shippingNote').optional().isString().trim(),
  ],
  createOrder
);

router.get('/my', requireAuth, getMyOrders);
router.post('/payment-status/sync', requireAuth, syncOrderPaymentStatus);
router.get('/services/my', requireAuth, getMyServices);
router.post('/services/:serviceId/renew', requireAuth, renewService);
router.post('/:orderId/review', requireAuth, reviewGlobalLimiter, reviewLimiter, submitReview);

module.exports = router;

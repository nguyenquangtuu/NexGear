const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const homeBannersController = require('../controllers/homeBanners.controller');
const banksController = require('../controllers/banks.controller');
const siteSettingsController = require('../controllers/siteSettings.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/products/search', adminController.searchAdminProducts);
router.get('/variants/search', adminController.searchAdminVariants);
router.post('/bulk-email/preview', adminController.previewBulkEmailAudience);
router.post('/bulk-email/send', adminController.sendBulkEmail);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id', adminController.updateUserProfile);
router.patch('/users/:id/balance', adminController.adjustUserBalance);
router.patch('/users/:id/block', adminController.updateUserBlockStatus);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetail);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/:id/items/:itemId/data', adminController.updateOrderItemData);
router.get('/services', adminController.getAdminServices);
router.get('/services/:id', adminController.getAdminServiceDetail);
router.put('/services/:id', adminController.updateAdminService);
router.get('/transactions', adminController.getTransactions);
router.get('/products', adminController.getAdminProducts);
router.get('/products/:id', adminController.getAdminProductDetail);
router.post('/products', adminController.createAdminProduct);
router.put('/products/:id', adminController.updateAdminProduct);

router.get('/categories', adminController.getAdminCategories);
router.post('/categories', adminController.createAdminCategory);
router.put('/categories/:id', adminController.updateAdminCategory);
router.delete('/categories/:id', adminController.deleteAdminCategory);

router.get('/home-banners', homeBannersController.getAdminHomeBanners);
router.post('/home-banners', homeBannersController.createAdminHomeBanner);
router.put('/home-banners/:id', homeBannersController.updateAdminHomeBanner);
router.delete('/home-banners/:id', homeBannersController.deleteAdminHomeBanner);
router.get('/site-settings', siteSettingsController.getAdminSiteSettings);
router.put('/site-settings', siteSettingsController.updateAdminSiteSettings);
router.get('/banks', banksController.getAdminBanks);
router.post('/banks', banksController.createAdminBank);
router.put('/banks/:id', banksController.updateAdminBank);
router.delete('/banks/:id', banksController.deleteAdminBank);

// Product variants
router.post('/products/:productId/variants', adminController.createProductVariant);
router.put('/variants/:id', adminController.updateProductVariant);
router.delete('/variants/:id', adminController.deleteProductVariant);

// Warehouse management
router.get('/variants/:variantId/warehouse', adminController.getWarehouseItems);
router.post('/variants/:variantId/warehouse', adminController.addWarehouseItems);
router.delete('/warehouse/:id', adminController.deleteWarehouseItem);

// Coupons and related searches
const adminCouponsController = require('../controllers/admin.coupons.controller');
router.get('/coupons', adminCouponsController.getCoupons);
router.post('/coupons', adminCouponsController.createCoupon);
router.get('/coupons/:id', adminCouponsController.getCouponById);
router.put('/coupons/:id', adminCouponsController.updateCoupon);
router.delete('/coupons/:id', adminCouponsController.deleteCoupon);
router.get('/coupons/:id/usage', adminCouponsController.getCouponUsage);
router.get('/variants', adminCouponsController.getVariantsForSearch);

module.exports = router;

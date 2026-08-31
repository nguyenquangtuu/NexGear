const dashboardCtrl = require('./admin/dashboard.controller');
const usersCtrl = require('./admin/users.controller');
const ordersCtrl = require('./admin/orders.controller');
const catalogCtrl = require('./admin/catalog.controller');

module.exports = {
  // Dashboard
  getDashboardStats: dashboardCtrl.getDashboardStats,

  // Users & Email
  getUsers: usersCtrl.getUsers,
  getUserDetail: usersCtrl.getUserDetail,
  updateUserProfile: usersCtrl.updateUserProfile,
  adjustUserBalance: usersCtrl.adjustUserBalance,
  updateUserBlockStatus: usersCtrl.updateUserBlockStatus,
  updateUserRole: usersCtrl.updateUserRole,
  previewBulkEmailAudience: usersCtrl.previewBulkEmailAudience,
  sendBulkEmail: usersCtrl.sendBulkEmail,

  // Orders, Services & Transactions
  getOrders: ordersCtrl.getOrders,
  getOrderDetail: ordersCtrl.getOrderDetail,
  updateOrderStatus: ordersCtrl.updateOrderStatus,
  updateOrderItemData: ordersCtrl.updateOrderItemData,
  getAdminServices: ordersCtrl.getAdminServices,
  getAdminServiceDetail: ordersCtrl.getAdminServiceDetail,
  updateAdminService: ordersCtrl.updateAdminService,
  getTransactions: ordersCtrl.getTransactions,

  // Catalog (Products, Variants, Categories, Warehouse, Search)
  searchAdminProducts: catalogCtrl.searchAdminProducts,
  searchAdminVariants: catalogCtrl.searchAdminVariants,
  getAdminProducts: catalogCtrl.getAdminProducts,
  getAdminProductDetail: catalogCtrl.getAdminProductDetail,
  createAdminProduct: catalogCtrl.createAdminProduct,
  updateAdminProduct: catalogCtrl.updateAdminProduct,
  addWarehouseItems: catalogCtrl.addWarehouseItems,
  getWarehouseItems: catalogCtrl.getWarehouseItems,
  deleteWarehouseItem: catalogCtrl.deleteWarehouseItem,
  createProductVariant: catalogCtrl.createProductVariant,
  updateProductVariant: catalogCtrl.updateProductVariant,
  deleteProductVariant: catalogCtrl.deleteProductVariant,
  getAdminCategories: catalogCtrl.getAdminCategories,
  createAdminCategory: catalogCtrl.createAdminCategory,
  updateAdminCategory: catalogCtrl.updateAdminCategory,
  deleteAdminCategory: catalogCtrl.deleteAdminCategory,
};

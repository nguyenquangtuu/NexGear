const checkoutCtrl = require('./orders-checkout');
const webhookCtrl = require('./orders-webhook');
const reviewCtrl = require('./orders-review');
const listCtrl = require('./orders-list');

module.exports = {
  createOrder: checkoutCtrl.createOrderWithSepay,
  renewService: checkoutCtrl.renewService,
  receiveSepayWebhook: webhookCtrl.receiveSepayWebhook,
  syncOrderPaymentStatus: webhookCtrl.syncOrderPaymentStatus,
  submitReview: reviewCtrl.submitReview,
  previewDiscount: listCtrl.previewDiscount,
  getMyOrders: listCtrl.getMyOrders,
  getMyServices: listCtrl.getMyServices,
};

const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/my', requireAuth, transactionsController.getMyTransactions);

module.exports = router;

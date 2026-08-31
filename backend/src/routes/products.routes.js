const express = require('express');
const { getProducts, getProductByIdentifier } = require('../controllers/products.controller');

const router = express.Router();

router.get('/', getProducts);
router.get('/by-ids', require('../controllers/products.controller').getProductsByIds);
router.get('/:identifier', getProductByIdentifier);

module.exports = router;

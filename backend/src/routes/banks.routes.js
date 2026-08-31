const express = require('express');
const { getBanks } = require('../controllers/banks.controller');

const router = express.Router();

router.get('/', getBanks);

module.exports = router;

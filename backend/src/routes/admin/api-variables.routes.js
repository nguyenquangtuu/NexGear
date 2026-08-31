const express = require('express');
const router = express.Router();
const apiVariablesController = require('../../controllers/admin/api-variables.controller');
const { requireAdmin } = require('../../middlewares/auth.middleware');

router.use(requireAdmin);

router.get('/', apiVariablesController.getAllVariables);
router.post('/', apiVariablesController.createVariable);
router.put('/:id', apiVariablesController.updateVariable);
router.delete('/:id', apiVariablesController.deleteVariable);

module.exports = router;

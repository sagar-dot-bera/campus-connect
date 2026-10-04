const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.get('/', orderController.list);
router.post('/', orderController.create);
router.get('/:id', orderController.get);

module.exports = router;

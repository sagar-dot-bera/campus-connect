const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

router.get('/', productController.list);
router.post('/', productController.create);
router.get('/:id', productController.get);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

module.exports = router;

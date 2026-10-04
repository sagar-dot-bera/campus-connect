const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.get);
router.put('/:id', userController.update);
router.patch('/:id', userController.patch);
router.delete('/:id', userController.remove);

module.exports = router;

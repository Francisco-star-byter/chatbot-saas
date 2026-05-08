const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth');
const { listProperties, createProperty, updateProperty, deleteProperty } = require('../controllers/propertiesController');

router.get('/', userAuth, listProperties);
router.post('/', userAuth, createProperty);
router.put('/:id', userAuth, updateProperty);
router.delete('/:id', userAuth, deleteProperty);

module.exports = router;

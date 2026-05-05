const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middlewares/adminAuth');
const { createClient, getClientConfig, updateClientConfig, listClients } = require('../controllers/adminController');

router.use(adminAuth);

router.get('/clients', listClients);
router.post('/clients', createClient);
router.get('/clients/:id', getClientConfig);
router.put('/clients/:id', updateClientConfig);

module.exports = router;

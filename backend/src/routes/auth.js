const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth');
const { setupAccount, getMe, updateConfig, getLeads } = require('../controllers/authController');

router.post('/setup', userAuth, setupAccount);
router.get('/me', userAuth, getMe);
router.put('/config', userAuth, updateConfig);
router.get('/leads', userAuth, getLeads);

module.exports = router;

const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth');
const { setupAccount, getMe, updateConfig, getLeads, patchLeadStatus } = require('../controllers/authController');

router.post('/setup', userAuth, setupAccount);
router.get('/me', userAuth, getMe);
router.put('/config', userAuth, updateConfig);
router.get('/leads', userAuth, getLeads);
router.patch('/leads/:id/status', userAuth, patchLeadStatus);

module.exports = router;

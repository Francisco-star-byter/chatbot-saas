const express = require('express');
const router = express.Router();
const { listLeads, leadStats, patchLeadStatus } = require('../controllers/leadsController');

router.get('/', listLeads);
router.get('/stats', leadStats);
router.patch('/:id/status', patchLeadStatus);

module.exports = router;

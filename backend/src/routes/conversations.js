const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/userAuth');
const { listConversations, getConversationDetail } = require('../controllers/conversationsController');

router.get('/', userAuth, listConversations);
router.get('/:id', userAuth, getConversationDetail);

module.exports = router;

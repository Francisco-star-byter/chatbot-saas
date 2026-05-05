const express = require('express');
const router = express.Router();
const { chatController } = require('../controllers/chatController');
const { validateChatRequest } = require('../middlewares/validateRequest');
const { chatLimiter } = require('../middlewares/rateLimiter');

router.post('/', chatLimiter, validateChatRequest, chatController);

module.exports = router;

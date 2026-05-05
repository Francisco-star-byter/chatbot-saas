const express = require('express');
const router = express.Router();
const { chatController, greetingController } = require('../controllers/chatController');
const { validateChatRequest } = require('../middlewares/validateRequest');
const { chatLimiter } = require('../middlewares/rateLimiter');

router.get('/greeting', greetingController);
router.post('/', chatLimiter, validateChatRequest, chatController);

module.exports = router;

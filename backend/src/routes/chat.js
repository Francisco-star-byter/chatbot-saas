const express = require('express');
const router = express.Router();
const { chatController, greetingController, publicPropertiesController } = require('../controllers/chatController');
const { validateChatRequest } = require('../middlewares/validateRequest');
const { chatLimiter } = require('../middlewares/rateLimiter');

router.get('/greeting', greetingController);
router.get('/properties', publicPropertiesController);
router.post('/', chatLimiter, validateChatRequest, chatController);

module.exports = router;

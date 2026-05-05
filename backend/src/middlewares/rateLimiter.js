const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait before sending more messages.',
  },
  keyGenerator: (req) => {
    return req.body?.client_id
      ? `${req.ip}-${req.body.client_id}`
      : req.ip;
  },
});

module.exports = { chatLimiter };

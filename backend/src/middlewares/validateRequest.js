function validateChatRequest(req, res, next) {
  const { client_id, message } = req.body;

  if (!client_id || typeof client_id !== 'string' || client_id.trim() === '') {
    return res.status(400).json({ error: 'client_id is required and must be a non-empty string' });
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'message must not exceed 1000 characters' });
  }

  req.body.client_id = client_id.trim();
  req.body.message = message.trim();

  next();
}

module.exports = { validateChatRequest };

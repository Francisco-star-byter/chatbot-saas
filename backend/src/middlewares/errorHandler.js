function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };

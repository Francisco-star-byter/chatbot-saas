function log(level, context, message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  if (data) {
    console.log(entry, JSON.stringify(data));
  } else {
    console.log(entry);
  }
}

const logger = {
  info: (context, message, data) => log('info', context, message, data),
  warn: (context, message, data) => log('warn', context, message, data),
  error: (context, message, data) => log('error', context, message, data),
};

module.exports = logger;

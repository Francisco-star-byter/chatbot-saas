require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const chatRoutes = require('./routes/chat');
const leadsRoutes = require('./routes/leads');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — in production, restrict to known origins
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : '*',
  methods: ['GET', 'POST'],
}));

// Body parsing
app.use(express.json({ limit: '50kb' }));

// Serve widget files
const widgetPath = path.resolve(__dirname, '..', '..', 'widget');
app.use('/widget', express.static(widgetPath));

// Routes
app.use('/health', healthRoutes);
app.use('/chat', chatRoutes);
app.use('/leads', leadsRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('server', `Running on port ${PORT}`, { env: process.env.NODE_ENV });
});

module.exports = app;

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const chatRoutes = require('./routes/chat');
const leadsRoutes = require('./routes/leads');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const propertiesRoutes = require('./routes/properties');
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — open for widget embedding on any site
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Body parsing
app.use(express.json({ limit: '50kb' }));

// Serve widget files
const widgetPath = path.resolve(__dirname, '..', 'widget');
app.use('/widget', express.static(widgetPath));

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/leads', leadsRoutes);
app.use('/admin', adminRoutes);
app.use('/properties', propertiesRoutes);

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

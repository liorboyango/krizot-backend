/**
 * Krizot Backend — Entry Point
 *
 * Express server backed by Firebase Firestore + Firebase Auth.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
require('./config/firebaseAdmin'); // initialise Firebase on boot
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const scheduleRoutes = require('./routes/schedules');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = env.server.port;

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = env.cors.origins;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// ─── Parsing & Logging ────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!env.isTest) {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
      skip: (req) => req.url === '/health' || req.url.startsWith('/health/'),
    })
  );
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

app.use('/api', globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

function startServer() {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Krizot API server running on port ${PORT}`);
    logger.info(`   Environment: ${env.env}`);
    logger.info(`   Health check: http://localhost:${PORT}/health`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (!env.isTest) {
  startServer();
}

module.exports = app;

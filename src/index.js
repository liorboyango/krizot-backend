/**
 * Krizot Backend - Main Entry Point
 * Express server setup with security middleware, routing, and database connection
 */

'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { prisma } = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const scheduleRoutes = require('./routes/schedules');
const userRoutes = require('./routes/users');

// ─── App Initialization ───────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Security Middleware ──────────────────────────────────────────────────────

/**
 * Helmet sets various HTTP headers for security:
 * - Content-Security-Policy
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (HSTS)
 */
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

/**
 * CORS configuration - restrict origins in production
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (NODE_ENV === 'development') return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
}));

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.http(message.trim()) },
  }));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', globalRateLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
/**
 * @route   GET /health
 * @desc    Health check endpoint for load balancers and monitoring
 * @access  Public
 */
app.get('/health', async (req, res) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      database: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      database: 'disconnected',
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/schedules', scheduleRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Startup ───────────────────────────────────────────────────────────

/**
 * Graceful shutdown handler
 * Closes database connections and HTTP server cleanly
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Unhandled promise rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development to allow debugging
  if (NODE_ENV === 'production') process.exit(1);
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Start the HTTP server
 */
const startServer = async () => {
  try {
    // Verify database connection on startup
    await prisma.$connect();
    logger.info('Database connection established.');

    app.listen(PORT, () => {
      logger.info(`Krizot API server running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // Export for testing

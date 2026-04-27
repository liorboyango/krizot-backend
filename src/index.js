/**
 * Krizot Backend - Application Entry Point
 * Express server with PostgreSQL/Prisma, JWT auth, and REST API
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { config, validateEnv } = require('./config');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Validate environment variables on startup
try {
  validateEnv();
} catch (err) {
  console.error('❌ Environment validation failed:', err.message);
  process.exit(1);
}

const app = express();

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// Request Parsing
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// Logging
// ============================================================
if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ============================================================
// Health Check
// ============================================================
app.get('/health', async (req, res) => {
  const { checkDatabaseHealth } = require('./config/database');
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// ============================================================
// API Routes (to be added in subsequent tasks)
// ============================================================
app.get(`${config.apiPrefix}`, (req, res) => {
  res.json({
    success: true,
    message: 'Krizot API v1',
    version: '1.0.0',
    endpoints: {
      auth: `${config.apiPrefix}/auth`,
      users: `${config.apiPrefix}/users`,
      stations: `${config.apiPrefix}/stations`,
      schedules: `${config.apiPrefix}/schedules`,
    },
  });
});

// ============================================================
// Error Handling
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// Server Startup
// ============================================================
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Krizot API server running`, {
        port: config.port,
        env: config.env,
        apiPrefix: config.apiPrefix,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start the server (unless in test mode)
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

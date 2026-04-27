/**
 * Database Configuration
 * Prisma Client singleton with connection management
 */

const { PrismaClient } = require('@prisma/client');

const logger = require('../utils/logger');

/**
 * Prisma client options based on environment
 */
const prismaOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
  errorFormat: 'pretty',
};

/**
 * Singleton Prisma Client instance
 * Prevents multiple connections in development (hot-reload)
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  // In development, use global to prevent multiple instances
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaOptions);
  }
  prisma = global.__prisma;
}

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error', { message: e.message, target: e.target });
});

// Log warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', { message: e.message });
});

/**
 * Connect to the database
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from the database
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Database disconnect error', { error: error.message });
  }
}

/**
 * Health check - verify database is reachable
 * @returns {Promise<boolean>}
 */
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return false;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
};

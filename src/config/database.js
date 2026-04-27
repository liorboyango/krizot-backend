/**
 * Database Configuration
 * Initializes and exports the Prisma client singleton.
 * Ensures a single connection pool is reused across the application.
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

/**
 * Get or create the Prisma client singleton.
 * @returns {PrismaClient}
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }
  return prisma;
}

/**
 * Connect to the database.
 * Call this during application startup.
 */
async function connectDatabase() {
  const client = getPrismaClient();
  try {
    await client.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from the database.
 * Call this during graceful shutdown.
 */
async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }
}

module.exports = { getPrismaClient, connectDatabase, disconnectDatabase };

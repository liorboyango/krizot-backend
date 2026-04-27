/**
 * Database Configuration
 * Prisma client initialization and connection management.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Singleton Prisma client instance
let prisma;

/**
 * Get or create the Prisma client instance (singleton pattern).
 * @returns {PrismaClient} Prisma client instance
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'minimal',
    });

    // Log Prisma queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug(`Prisma Query: ${e.query} | Duration: ${e.duration}ms`);
      });
    }

    prisma.$on('error', (e) => {
      logger.error('Prisma error:', e);
    });

    prisma.$on('warn', (e) => {
      logger.warn('Prisma warning:', e);
    });
  }

  return prisma;
}

/**
 * Connect to the database.
 * @throws {Error} If connection fails
 */
async function connectDatabase() {
  const client = getPrismaClient();
  await client.$connect();
}

/**
 * Disconnect from the database.
 */
async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

module.exports = {
  getPrismaClient,
  connectDatabase,
  disconnectDatabase,
};

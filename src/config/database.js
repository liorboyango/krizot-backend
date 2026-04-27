/**
 * Database Configuration
 * Prisma client singleton with connection management
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Prisma client configuration with logging
 * In development: log queries, errors, and warnings
 * In production: log only errors
 */
const prismaConfig = {
  log: NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ]
    : [
        { emit: 'event', level: 'error' },
      ],
};

// Singleton pattern to prevent multiple Prisma instances in development (hot reload)
let prisma;

if (NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaConfig);
} else {
  // In development, reuse the global instance to avoid connection pool exhaustion
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.__prisma;
}

// Attach event listeners for logging
if (NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

module.exports = { prisma };

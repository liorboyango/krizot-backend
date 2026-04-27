/**
 * Prisma Client Singleton
 *
 * Provides a single shared PrismaClient instance across the application.
 * In development, reuses the instance across hot-reloads to avoid
 * exhausting database connections.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');

/**
 * Prisma client configuration options
 */
const prismaOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
  errorFormat: 'pretty',
};

/**
 * Singleton PrismaClient instance.
 * In production, creates a new instance.
 * In development, reuses the global instance to prevent connection pool exhaustion
 * during hot-reloads (e.g., with nodemon).
 *
 * @type {PrismaClient}
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  // Reuse existing global instance in non-production environments
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaOptions);
  }
  prisma = global.__prisma;
}

/**
 * Connect to the database.
 * Should be called during application startup.
 *
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Disconnect from the database.
 * Should be called during graceful shutdown.
 *
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection error:', error.message);
    throw error;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};

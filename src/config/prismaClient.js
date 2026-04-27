/**
 * Prisma Client Singleton
 * Exports a single PrismaClient instance to be reused across the application.
 * Prevents connection pool exhaustion in development (hot-reload).
 */

const { PrismaClient } = require('@prisma/client');

var prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // In development, reuse the global instance to avoid exhausting connections
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;

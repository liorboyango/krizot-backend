/**
 * Prisma Client Singleton
 * Exports a single shared PrismaClient instance to avoid
 * exhausting the database connection pool in development
 * (Next.js / hot-reload safe pattern).
 */

const { PrismaClient } = require('@prisma/client');

const prisma =
  global.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;

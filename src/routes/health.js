/**
 * Health Check Routes
 *
 * Provides endpoints for liveness and readiness probes.
 * Used by load balancers, container orchestrators, and monitoring tools.
 */

'use strict';

const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /health
 * Liveness probe — confirms the process is running.
 */
router.get('/', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  }, 'Service is healthy');
});

/**
 * GET /health/ready
 * Readiness probe — confirms the service can handle traffic (DB connected).
 */
router.get('/ready', asyncHandler(async (req, res) => {
  const checks = { database: 'unknown' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err) {
    logger.error('Health check: database unreachable', { error: err.message });
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  const statusCode = allOk ? 200 : 503;

  return res.status(statusCode).json({
    success: allOk,
    message: allOk ? 'Service is ready' : 'Service is not ready',
    data: { status: allOk ? 'ready' : 'degraded', checks },
  });
}));

module.exports = router;

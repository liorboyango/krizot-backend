/**
 * Health Check Routes
 *
 * Liveness + readiness probes for orchestrators / load balancers.
 */

'use strict';

const { Router } = require('express');
const { db } = require('../config/firebaseAdmin');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

const router = Router();

router.get('/', (req, res) => {
  sendSuccess(
    res,
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    },
    'Service is healthy'
  );
});

router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const checks = { firestore: 'unknown' };
    try {
      await db.collection('_health').limit(1).get();
      checks.firestore = 'ok';
    } catch (err) {
      logger.error('Health check: firestore unreachable', { error: err.message });
      checks.firestore = 'error';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    const statusCode = allOk ? 200 : 503;
    return res.status(statusCode).json({
      success: allOk,
      message: allOk ? 'Service is ready' : 'Service is not ready',
      data: { status: allOk ? 'ready' : 'degraded', checks },
    });
  })
);

module.exports = router;

/**
 * Rate Limiting Middleware
 *
 * Provides two limiters:
 *   - globalLimiter:  100 req/min per IP (all routes)
 *   - authLimiter:    10 req/min per IP (auth routes — brute-force protection)
 *
 * Uses express-rate-limit (simple, no Redis required).
 * For production with multiple instances, swap the store for a Redis store.
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { RateLimitError } = require('../utils/errors');

// ─── Shared Handler ───────────────────────────────────────────────────────────

const rateLimitHandler = (req, res, next, options) => {
  next(new RateLimitError(
    `Too many requests. Limit: ${options.max} per ${options.windowMs / 1000}s. Try again later.`,
  ));
};

// ─── Global Limiter ───────────────────────────────────────────────────────────

/**
 * Applied to all API routes.
 * Default: 100 requests per 60 seconds per IP.
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: () => config.isTest, // skip during tests
});

// ─── Auth Limiter ─────────────────────────────────────────────────────────────

/**
 * Applied to authentication routes only.
 * Default: 10 requests per 60 seconds per IP.
 * Protects against brute-force login attacks.
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => config.isTest,
});

module.exports = { globalLimiter, authLimiter };

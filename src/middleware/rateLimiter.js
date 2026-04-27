/**
 * Rate Limiting Middleware
 *
 * Protects the API from abuse using rate-limiter-flexible.
 * Different limits are applied to auth endpoints vs general API endpoints.
 */

const { RateLimiterMemory } = require('rate-limiter-flexible');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─── Limiters ────────────────────────────────────────────────────────────────

/**
 * General API rate limiter: 100 requests per minute per IP.
 */
const apiLimiter = new RateLimiterMemory({
  keyPrefix: 'api',
  points: 100,       // requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60s after limit exceeded
});

/**
 * Auth endpoint rate limiter: 10 attempts per 15 minutes per IP.
 * Stricter to prevent brute-force attacks.
 */
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 10,         // attempts
  duration: 15 * 60,  // per 15 minutes
  blockDuration: 15 * 60, // block for 15 minutes after limit exceeded
});

/**
 * Strict limiter for sensitive operations (e.g., password reset): 5 per hour.
 */
const strictLimiter = new RateLimiterMemory({
  keyPrefix: 'strict',
  points: 5,
  duration: 60 * 60,
  blockDuration: 60 * 60,
});

// ─── Middleware factories ─────────────────────────────────────────────────────

/**
 * Creates an Express middleware from a RateLimiterMemory instance.
 * @param {RateLimiterMemory} limiter
 * @returns {import('express').RequestHandler}
 */
function createRateLimitMiddleware(limiter) {
  return async (req, res, next) => {
    try {
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      // rejRes is a RateLimiterRes object when limit is exceeded
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 60;

      logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);

      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(limiter.points));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(new Date(Date.now() + rejRes.msBeforeNext).toISOString()));

      next(
        new AppError(
          `Too many requests. Please try again in ${retryAfter} seconds.`,
          429
        )
      );
    }
  };
}

const apiRateLimit = createRateLimitMiddleware(apiLimiter);
const authRateLimit = createRateLimitMiddleware(authLimiter);
const strictRateLimit = createRateLimitMiddleware(strictLimiter);

module.exports = { apiRateLimit, authRateLimit, strictRateLimit };

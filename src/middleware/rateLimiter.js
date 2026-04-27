/**
 * Rate Limiter Middleware
 * Protects API endpoints from abuse using rate-limiter-flexible.
 */

'use strict';

const { RateLimiterMemory } = require('rate-limiter-flexible');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// General API rate limiter: 100 requests per minute per IP
const apiLimiter = new RateLimiterMemory({
  keyPrefix: 'api_general',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  duration: 60, // per 60 seconds
  blockDuration: 60, // block for 60 seconds if exceeded
});

// Strict rate limiter for auth endpoints: 10 requests per minute per IP
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'api_auth',
  points: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  duration: 60,
  blockDuration: 300, // block for 5 minutes if exceeded
});

/**
 * General API rate limiter middleware.
 */
async function rateLimiter(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    await apiLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 60;
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.set('Retry-After', String(retryAfter));
    next(
      new AppError(
        `Too many requests. Please retry after ${retryAfter} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      )
    );
  }
}

/**
 * Strict rate limiter middleware for authentication endpoints.
 */
async function authRateLimiter(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    await authLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 300;
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.set('Retry-After', String(retryAfter));
    next(
      new AppError(
        `Too many authentication attempts. Please retry after ${retryAfter} seconds.`,
        429,
        'AUTH_RATE_LIMIT_EXCEEDED'
      )
    );
  }
}

module.exports = { rateLimiter, authRateLimiter };

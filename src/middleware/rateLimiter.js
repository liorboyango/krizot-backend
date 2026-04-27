/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse using rate-limiter-flexible
 */

'use strict';

const { RateLimiterMemory } = require('rate-limiter-flexible');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Global API rate limiter: 100 requests per minute per IP
 */
const globalLimiter = new RateLimiterMemory({
  keyPrefix: 'global',
  points: parseInt(process.env.RATE_LIMIT_POINTS || '100', 10),
  duration: parseInt(process.env.RATE_LIMIT_DURATION || '60', 10), // seconds
});

/**
 * Auth endpoint rate limiter: 10 attempts per 15 minutes per IP
 * Prevents brute-force attacks on login
 */
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: parseInt(process.env.AUTH_RATE_LIMIT_POINTS || '10', 10),
  duration: parseInt(process.env.AUTH_RATE_LIMIT_DURATION || '900', 10), // 15 minutes
  blockDuration: 900, // Block for 15 minutes after limit exceeded
});

/**
 * Global rate limiter middleware
 * Applied to all /api routes
 */
const globalRateLimiter = async (req, res, next) => {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await globalLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
    res.set('Retry-After', String(retryAfter));
    res.set('X-RateLimit-Limit', String(globalLimiter.points));
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());

    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    next(new AppError('Too many requests. Please try again later.', 429));
  }
};

/**
 * Auth rate limiter middleware
 * Applied specifically to authentication endpoints
 */
const authRateLimiter = async (req, res, next) => {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await authLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
    res.set('Retry-After', String(retryAfter));

    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    next(new AppError('Too many login attempts. Please try again in 15 minutes.', 429));
  }
};

module.exports = { globalRateLimiter, authRateLimiter };

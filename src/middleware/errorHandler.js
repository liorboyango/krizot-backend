/**
 * Global Error Handling Middleware
 *
 * Catches all errors forwarded via next(err) and returns a consistent
 * JSON error response. Distinguishes between operational errors
 * (safe to expose) and programmer errors (log only, generic message).
 */

'use strict';

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─── Prisma Error Normalizer ──────────────────────────────────────────────────

/**
 * Maps Prisma client errors to AppErrors.
 * @param {Error} err
 * @returns {AppError|null}
 */
const normalizePrismaError = (err) => {
  // Prisma known request errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    const { ConflictError } = require('../utils/errors');
    return new ConflictError(`A record with this ${field} already exists`);
  }
  if (err.code === 'P2025') {
    const { NotFoundError } = require('../utils/errors');
    return new NotFoundError('Record');
  }
  if (err.code === 'P2003') {
    const { BadRequestError } = require('../utils/errors');
    return new BadRequestError('Foreign key constraint failed — referenced record does not exist');
  }
  if (err.code === 'P2014') {
    const { BadRequestError } = require('../utils/errors');
    return new BadRequestError('Relation violation — the change would violate a required relation');
  }
  return null;
};

// ─── JWT Error Normalizer ─────────────────────────────────────────────────────

const normalizeJwtError = (err) => {
  const { InvalidTokenError } = require('../utils/errors');
  if (err.name === 'JsonWebTokenError') return new InvalidTokenError('Invalid token');
  if (err.name === 'TokenExpiredError') return new InvalidTokenError('Token has expired');
  if (err.name === 'NotBeforeError') return new InvalidTokenError('Token not yet valid');
  return null;
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * 404 handler — must be registered AFTER all routes.
 */
const notFoundHandler = (req, res, next) => {
  const { NotFoundError } = require('../utils/errors');
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler — must be registered LAST with 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Attempt to normalize known third-party errors
  let error = err;

  if (!error.isOperational) {
    const prismaError = normalizePrismaError(err);
    if (prismaError) {
      error = prismaError;
    } else {
      const jwtError = normalizeJwtError(err);
      if (jwtError) error = jwtError;
    }
  }

  // Determine status code
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational === true;

  // Log the error
  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
    });
  } else {
    logger.warn('Client error', {
      message: error.message,
      code: error.code,
      statusCode,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    });
  }

  // Build response — never leak stack traces or internal details in production
  const config = require('../config/env');
  const body = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: isOperational ? error.message : 'An unexpected error occurred',
    },
  };

  // Include validation details when available
  if (error.details) body.error.details = error.details;

  // Include stack trace in development only
  if (!config.isProduction && error.stack) {
    body.error.stack = error.stack;
  }

  return res.status(statusCode).json(body);
};

module.exports = { errorHandler, notFoundHandler };

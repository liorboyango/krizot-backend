/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(err) and returns a consistent
 * JSON error response. Must be registered LAST in the Express app.
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Handles Prisma-specific errors and maps them to AppErrors.
 *
 * @param {Error} err
 * @returns {AppError}
 */
function handlePrismaError(err) {
  // Unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return new AppError(`A record with this ${field} already exists`, 409);
  }
  // Record not found
  if (err.code === 'P2025') {
    return new AppError('Record not found', 404);
  }
  // Foreign key constraint
  if (err.code === 'P2003') {
    return new AppError('Related record not found', 400);
  }
  return new AppError('Database error', 500);
}

/**
 * Express global error handler.
 * Signature must have 4 parameters for Express to recognize it as an error handler.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Map Prisma errors to AppErrors
  if (err.constructor?.name?.startsWith('Prisma') || err.code?.startsWith('P')) {
    error = handlePrismaError(err);
  }

  // Default to 500 for unexpected errors
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Log non-operational (unexpected) errors with full stack
  if (!isOperational) {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Operational error', {
      message: err.message,
      statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Never leak internal error details in production
  const message =
    isOperational || process.env.NODE_ENV !== 'production'
      ? error.message
      : 'An unexpected error occurred. Please try again later.';

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && !isOperational && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;

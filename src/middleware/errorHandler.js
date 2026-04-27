/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(error) and returns
 * a consistent JSON error response.
 *
 * Must be registered LAST in the Express middleware chain.
 */

const { AppError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Global error handling middleware.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the error
  if (err.isOperational) {
    logger.warn(`[${err.statusCode}] ${err.message}`, {
      path: req.path,
      method: req.method,
      code: err.code,
    });
  } else {
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include field-level validation details if available
    if (err instanceof ValidationError && err.details && err.details.length > 0) {
      response.error.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle Prisma-specific errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found',
      },
    });
  }

  // Handle JWT errors (fallback)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }

  // Fallback: generic 500 error
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    },
  });
}

module.exports = errorHandler;

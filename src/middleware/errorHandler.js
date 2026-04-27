/**
 * Global Error Handler Middleware
 * Centralized error processing with consistent JSON responses
 */

'use strict';

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

/**
 * Global error handler
 * Processes all errors and returns consistent JSON responses
 *
 * Error response format:
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Human-readable error message",
 *     "code": "ERROR_CODE",       // optional
 *     "details": [...],           // optional validation errors
 *     "stack": "..."              // development only
 *   }
 * }
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || undefined;

  // Handle Prisma-specific errors
  if (err.code) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        message = `Duplicate value for field: ${err.meta?.target?.join(', ')}`;
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003': // Foreign key constraint
        statusCode = 400;
        message = 'Referenced record does not exist';
        break;
      case 'P2014': // Relation violation
        statusCode = 400;
        message = 'Invalid relation';
        break;
      default:
        if (err.code.startsWith('P')) {
          statusCode = 400;
          message = 'Database operation failed';
        }
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, ''),
    }));
  }

  // Log server errors (5xx)
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${req.method} ${req.originalUrl} - ${message}`, {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
    });
  } else {
    logger.warn(`[${statusCode}] ${req.method} ${req.originalUrl} - ${message}`);
  }

  const response = {
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

module.exports = { errorHandler, notFoundHandler };

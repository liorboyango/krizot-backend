/**
 * Global Error Handler Middleware
 * Centralized error processing and consistent error response formatting.
 */

'use strict';

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Format a Prisma error into a user-friendly AppError.
 * @param {Error} error - Prisma error
 * @returns {AppError} Formatted application error
 */
function handlePrismaError(error) {
  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(
      `A record with this ${field} already exists`,
      409,
      'DUPLICATE_ENTRY'
    );
  }

  // Record not found
  if (error.code === 'P2025') {
    return new AppError('Record not found', 404, 'NOT_FOUND');
  }

  // Foreign key constraint violation
  if (error.code === 'P2003') {
    return new AppError(
      'Related record not found',
      400,
      'FOREIGN_KEY_VIOLATION'
    );
  }

  // Invalid data
  if (error.code === 'P2000') {
    return new AppError('Invalid data provided', 400, 'INVALID_DATA');
  }

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
}

/**
 * Global error handling middleware.
 * Must be registered as the last middleware in Express.
 *
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next (required for error middleware signature)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Handle Prisma errors
  if (err.constructor?.name?.startsWith('Prisma') || err.code?.startsWith('P')) {
    error = handlePrismaError(err);
  }

  // Handle JWT errors (not caught by jwt config)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = new AppError('Invalid or expired token', 401, 'TOKEN_ERROR');
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    const message = err.details.map((d) => d.message).join('; ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Default to 500 for unknown errors
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : error.message || 'An unexpected error occurred';

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      code: errorCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = { errorHandler };

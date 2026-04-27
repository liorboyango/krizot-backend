/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(err) and returns structured JSON responses.
 * Distinguishes between operational errors (AppError) and programming errors.
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Handle Prisma-specific errors and map to AppError.
 */
function handlePrismaError(err) {
  // Unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return new AppError(`Duplicate value for ${field}`, 409);
  }
  // Record not found
  if (err.code === 'P2025') {
    return new AppError('Record not found', 404);
  }
  // Foreign key constraint
  if (err.code === 'P2003') {
    return new AppError('Referenced record does not exist', 400);
  }
  // Invalid value
  if (err.code === 'P2006') {
    return new AppError('Invalid value provided', 400);
  }
  return null;
}

/**
 * Global error handler middleware.
 * Must have 4 parameters for Express to recognize it as error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Handle Prisma errors
  if (err.constructor?.name?.startsWith('Prisma') || err.code?.startsWith('P')) {
    const prismaError = handlePrismaError(err);
    if (prismaError) error = prismaError;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError' && err.isJoi) {
    error = new AppError(err.message, 400);
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} - ${statusCode}: ${error.message}`, {
      stack: error.stack,
      body: req.body,
      user: req.user?.id,
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} - ${statusCode}: ${error.message}`);
  }

  // Don't leak internal error details in production
  const message =
    isOperational || process.env.NODE_ENV !== 'production'
      ? error.message
      : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}

module.exports = errorHandler;

/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized error responses
 */

const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const {
  AppError,
  ValidationError,
  NotFoundError,
} = require('../utils/errors');

/**
 * Handle Prisma-specific errors
 * @param {Error} err
 * @returns {{ message: string, statusCode: number, code: string, details: any }}
 */
function handlePrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = err.meta?.target?.[0] || 'field';
        return {
          message: `A record with this ${field} already exists`,
          statusCode: 409,
          code: 'DUPLICATE_ENTRY',
          details: { field, constraint: err.meta?.target },
        };
      }
      case 'P2025': {
        // Record not found
        return {
          message: 'Record not found',
          statusCode: 404,
          code: 'NOT_FOUND',
          details: null,
        };
      }
      case 'P2003': {
        // Foreign key constraint violation
        return {
          message: 'Related record not found',
          statusCode: 400,
          code: 'FOREIGN_KEY_ERROR',
          details: { field: err.meta?.field_name },
        };
      }
      case 'P2014': {
        // Required relation violation
        return {
          message: 'Required relation violation',
          statusCode: 400,
          code: 'RELATION_ERROR',
          details: null,
        };
      }
      default:
        return {
          message: 'Database operation failed',
          statusCode: 500,
          code: 'DATABASE_ERROR',
          details: null,
        };
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: null,
    };
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: 'Database connection failed',
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      details: null,
    };
  }

  return null;
}

/**
 * Global error handler middleware
 * Must be registered LAST in Express middleware chain
 */
function errorHandler(err, req, res, next) {
  // Log the error
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    errorName: err.name,
    errorCode: err.code,
  };

  // Handle operational errors (expected)
  if (err.isOperational) {
    logger.warn('Operational error', { ...logContext, message: err.message });
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle Prisma errors
  const prismaError = handlePrismaError(err);
  if (prismaError) {
    logger.warn('Prisma error', { ...logContext, prismaCode: err.code, message: err.message });
    return sendError(
      res,
      prismaError.message,
      prismaError.statusCode,
      prismaError.code,
      prismaError.details
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Unknown/programming errors - don't leak details in production
  logger.error('Unhandled error', {
    ...logContext,
    message: err.message,
    stack: err.stack,
  });

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  return sendError(res, message, 500, 'INTERNAL_ERROR');
}

/**
 * 404 Not Found handler
 * Register before errorHandler for unmatched routes
 */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };

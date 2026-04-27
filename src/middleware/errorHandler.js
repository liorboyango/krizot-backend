/**
 * Global Error Handler Middleware
 *
 * Catches all errors passed via next(err) and returns structured JSON responses.
 * Distinguishes between operational errors (AppError) and unexpected errors.
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * notFound middleware
 *
 * Handles requests to undefined routes.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

/**
 * errorHandler middleware
 *
 * Central error handler. Must be registered LAST in the middleware chain.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Default to 500 for unexpected errors
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Prisma errors
  if (err.code) {
    const prismaError = handlePrismaError(err);
    if (prismaError) {
      statusCode = prismaError.statusCode;
      message = prismaError.message;
    }
  }

  // Handle JWT errors (shouldn't reach here normally, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token.';
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error('Unexpected server error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else {
    logger.warn('Client error', {
      message,
      statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // Build response — never leak stack traces in production
  const response = {
    success: false,
    error: {
      message,
      statusCode,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Maps Prisma error codes to HTTP-friendly errors.
 * @param {Error} err
 * @returns {{ statusCode: number, message: string } | null}
 */
function handlePrismaError(err) {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = err.meta?.target?.join(', ') || 'field';
      return { statusCode: 409, message: `A record with this ${field} already exists.` };
    }
    case 'P2025':
      // Record not found
      return { statusCode: 404, message: 'The requested record was not found.' };
    case 'P2003':
      // Foreign key constraint
      return { statusCode: 400, message: 'Related record not found. Check referenced IDs.' };
    case 'P2014':
      return { statusCode: 400, message: 'Invalid relation data provided.' };
    default:
      return null;
  }
}

module.exports = { notFound, errorHandler };

/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(err) and returns structured JSON responses.
 * Handles Prisma errors, validation errors, JWT errors, and generic errors.
 */

const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
function errorHandler(err, req, res, next) {
  // Log the error (without sensitive data)
  logger.error('Unhandled error', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Handle Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          message: 'A record with this value already exists.',
          field: err.meta && err.meta.target,
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Record not found.',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'Invalid reference: related record does not exist.',
        });
      default:
        return res.status(500).json({
          success: false,
          message: 'Database error occurred.',
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided to database.',
    });
  }

  // Handle custom AppError
  if (err.statusCode) {
    const response = {
      success: false,
      message: err.message,
    };
    if (err.code) response.code = err.code;
    if (err.details) response.details = err.details;
    if (err.conflicts) response.conflicts = err.conflicts;
    return res.status(err.statusCode).json(response);
  }

  // Generic 500 error
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred.'
        : err.message,
  });
}

module.exports = errorHandler;

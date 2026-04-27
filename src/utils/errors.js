/**
 * Custom Error Classes
 *
 * AppError is the base class for all operational errors.
 * These are expected errors (e.g., 404, 401, 400) that should be
 * returned to the client with a meaningful message.
 */

/**
 * AppError - Operational error with HTTP status code.
 *
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object|null} details - Additional error details (e.g., validation errors)
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Capture stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * NotFoundError - 404 Not Found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * UnauthorizedError - 401 Unauthorized
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError - 403 Forbidden
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied.') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * ConflictError - 409 Conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists.') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * ValidationError - 400 Bad Request
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed.', details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
};

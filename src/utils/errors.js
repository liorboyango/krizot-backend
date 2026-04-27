/**
 * Custom Error Classes
 * Provides structured error types for consistent error handling.
 */

/**
 * AppError - Base application error with HTTP status code.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {string} [code] - Machine-readable error code
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || 500;
    this.code = code || null;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ValidationError - 400 Bad Request for input validation failures.
 */
class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details || [];
  }
}

/**
 * NotFoundError - 404 for missing resources.
 */
class NotFoundError extends AppError {
  constructor(resource) {
    super((resource || 'Resource') + ' not found', 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * UnauthorizedError - 401 for authentication failures.
 */
class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'Authentication required', 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError - 403 for authorization failures.
 */
class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'Access denied', 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * ConflictError - 409 for resource conflicts (e.g., scheduling conflicts).
 */
class ConflictError extends AppError {
  constructor(message, conflicts) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
    this.conflicts = conflicts || [];
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};

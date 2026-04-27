/**
 * Custom Error Classes
 * Provides structured error types for consistent API error responses.
 * Each error class maps to a specific HTTP status code.
 */

/**
 * Base application error class.
 * All custom errors extend this class.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input or validation failure.
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Array<{field: string, message: string}>} [details] - Field-level errors
   */
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 401 Unauthorized - Authentication required or failed.
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden - Authenticated but insufficient permissions.
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource does not exist.
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict.
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded.
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};

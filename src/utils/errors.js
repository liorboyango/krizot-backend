/**
 * Custom Error Classes
 * Structured error handling for the application
 */

'use strict';

/**
 * Base application error class
 * Extends native Error with HTTP status code and optional details
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Array} [details] - Optional array of validation error details
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Capture stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity
 * Used for business logic violations (e.g., scheduling conflicts)
 */
class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 422);
    this.name = 'BusinessLogicError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
};

/**
 * Custom Error Classes
 *
 * Provides a typed error hierarchy for consistent error handling
 * throughout the application.
 */

'use strict';

// ─── Base Application Error ───────────────────────────────────────────────────

/**
 * Base class for all operational (expected) errors.
 * Operational errors are safe to expose to clients.
 */
class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code]    - Machine-readable error code
   * @param {object} [details] - Additional context (validation errors, etc.)
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // distinguishes from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── 400 Bad Request ─────────────────────────────────────────────────────────

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

// ─── 401 Unauthorized ────────────────────────────────────────────────────────

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}

// ─── 403 Forbidden ───────────────────────────────────────────────────────────

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

// ─── 404 Not Found ───────────────────────────────────────────────────────────

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// ─── 409 Conflict ────────────────────────────────────────────────────────────

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class ScheduleConflictError extends AppError {
  constructor(message = 'Schedule conflict detected', details = null) {
    super(message, 409, 'SCHEDULE_CONFLICT', details);
  }
}

// ─── 422 Unprocessable Entity ────────────────────────────────────────────────

class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', details = null) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

// ─── 429 Too Many Requests ───────────────────────────────────────────────────

class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// ─── 500 Internal Server Error ───────────────────────────────────────────────

class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

// ─── 503 Service Unavailable ─────────────────────────────────────────────────

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  InvalidTokenError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ScheduleConflictError,
  UnprocessableError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
};

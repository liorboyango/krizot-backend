/**
 * Validation Middleware
 * Provides request body and query parameter validation using Joi schemas.
 * Returns standardized 400 error responses on validation failure.
 */

const { ValidationError } = require('../utils/errors');

/**
 * Validate request body against a Joi schema.
 *
 * @param {import('joi').Schema} schema - Joi validation schema
 * @returns {import('express').RequestHandler}
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // Return all errors, not just the first
      stripUnknown: true,  // Remove unknown fields
      convert: true,       // Allow type coercion (e.g., string '5' -> number 5)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Validation failed', details));
    }

    // Replace req.body with validated & sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate request query parameters against a Joi schema.
 *
 * @param {import('joi').Schema} schema - Joi validation schema
 * @returns {import('express').RequestHandler}
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Invalid query parameters', details));
    }

    req.query = value;
    next();
  };
}

module.exports = { validateBody, validateQuery };

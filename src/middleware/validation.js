/**
 * Validation Middleware
 * Joi schema validation for request body, params, and query.
 */

'use strict';

const { AppError } = require('../utils/errors');

/**
 * Middleware factory to validate request body against a Joi schema.
 * @param {object} schema - Joi validation schema
 * @returns {function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }

    req.body = value; // Use sanitized/coerced value
    next();
  };
}

/**
 * Middleware factory to validate request params against a Joi schema.
 * @param {object} schema - Joi validation schema
 * @returns {function} Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }

    req.params = value;
    next();
  };
}

/**
 * Middleware factory to validate request query against a Joi schema.
 * @param {object} schema - Joi validation schema
 * @returns {function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }

    req.query = value;
    next();
  };
}

module.exports = { validateBody, validateParams, validateQuery };

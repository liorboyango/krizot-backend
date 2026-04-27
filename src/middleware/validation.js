/**
 * Validation Middleware
 * Generic Joi validation wrapper for request body, query, and params.
 */

const { AppError } = require('../utils/errors');

/**
 * Validate req.body against a Joi schema.
 * Returns 400 with descriptive messages on failure.
 *
 * @param {import('joi').Schema} schema - Joi schema to validate against
 * @returns {import('express').RequestHandler}
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect all errors
      stripUnknown: true,  // remove unknown fields
      convert: true,       // coerce types (e.g. string '5' → number 5)
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return next(new AppError(messages, 400));
    }

    // Replace req.body with the validated (and sanitized) value
    req.body = value;
    return next();
  };
}

/**
 * Validate req.query against a Joi schema.
 *
 * @param {import('joi').Schema} schema
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
      const messages = error.details.map((d) => d.message).join('; ');
      return next(new AppError(messages, 400));
    }

    req.query = value;
    return next();
  };
}

/**
 * Validate req.params against a Joi schema.
 *
 * @param {import('joi').Schema} schema
 * @returns {import('express').RequestHandler}
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return next(new AppError(messages, 400));
    }

    req.params = value;
    return next();
  };
}

module.exports = { validateBody, validateQuery, validateParams };

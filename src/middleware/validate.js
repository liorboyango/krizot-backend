/**
 * Request Validation Middleware
 *
 * Validates request body, query params, and URL params against Joi schemas.
 * Returns structured 400 errors on validation failure.
 */

'use strict';

const { ValidationError } = require('../utils/errors');

/**
 * Creates an Express middleware that validates a specific part of the request.
 *
 * @param {object} schema    - Joi schema object
 * @param {'body'|'query'|'params'} [source='body'] - Part of request to validate
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,   // collect all errors, not just the first
    stripUnknown: true,  // remove unknown fields (security)
    convert: true,       // coerce types (e.g. string '1' → number 1)
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, "'"),
    }));
    return next(new ValidationError('Request validation failed', details));
  }

  // Replace request data with validated (and stripped) value
  req[source] = value;
  return next();
};

/**
 * Validate multiple parts of the request at once.
 *
 * @param {object} schemas - { body?, query?, params? } each a Joi schema
 * @returns {Function} Express middleware
 */
const validateRequest = (schemas) => (req, res, next) => {
  const allErrors = [];

  for (const [source, schema] of Object.entries(schemas)) {
    if (!schema) continue;
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => ({
        field: `${source}.${d.path.join('.')}`,
        message: d.message.replace(/"/g, "'"),
      }));
      allErrors.push(...details);
    } else {
      req[source] = value;
    }
  }

  if (allErrors.length > 0) {
    return next(new ValidationError('Request validation failed', allErrors));
  }

  return next();
};

module.exports = { validate, validateRequest };

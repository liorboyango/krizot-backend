/**
 * Validation Middleware
 * Joi schema validation for request body, query params, and route params.
 */

const { AppError } = require('../utils/errors');

/**
 * Middleware factory: Validate request data against a Joi schema.
 * @param {Object} schema - Joi schema object
 * @param {string} source - 'body' | 'query' | 'params' (default: 'body')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,   // Collect all errors, not just the first
      stripUnknown: true,  // Remove unknown fields
      convert: true,       // Type coercion (e.g., string '1' → number 1)
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return next(new AppError(`Validation error: ${messages}`, 400));
    }

    // Replace request data with validated/sanitized value
    req[source] = value;
    next();
  };
}

module.exports = { validate };

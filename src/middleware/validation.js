/**
 * Validation Middleware
 * Joi schema validation for request body, params, and query
 */

'use strict';

const Joi = require('joi');
const { AppError } = require('../utils/errors');

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,    // Return all errors, not just the first
      stripUnknown: true,   // Remove unknown fields
      convert: true,        // Type coercion (string to number, etc.)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(new AppError('Validation failed', 400, details));
    }

    req.body = value; // Replace with sanitized/coerced values
    next();
  };
};

/**
 * Validate request params against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(new AppError('Invalid URL parameters', 400, details));
    }

    req.params = value;
    next();
  };
};

/**
 * Validate query string against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(new AppError('Invalid query parameters', 400, details));
    }

    req.query = value;
    next();
  };
};

// ─── Common Schemas ───────────────────────────────────────────────────────────

/** UUID parameter schema */
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'ID must be a valid UUID',
    'any.required': 'ID parameter is required',
  }),
});

/** Pagination query schema */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  idParamSchema,
  paginationSchema,
};

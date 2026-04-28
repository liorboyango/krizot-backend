/**
 * Request Validation Middleware
 *
 * Uses Joi schemas to validate request body, query params, and URL params.
 * Returns structured 400 errors on validation failure.
 */

const Joi = require('joi');
const { AppError } = require('../utils/errors');

/**
 * validate middleware factory
 *
 * @param {Object} schema - Joi schema object with optional keys: body, query, params
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/login', validate({ body: loginSchema }), loginController);
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      }
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.query = value;
      }
    }

    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      }
    }

    if (errors.length > 0) {
      return next(
        new AppError('Validation failed', 400, { errors })
      );
    }

    next();
  };
}

// ─── Reusable Joi schemas ────────────────────────────────────────────────────

const schemas = {
  // Auth
  login: Joi.object({
    idToken: Joi.string().required().messages({
      'any.required': 'idToken is required.',
    }),
  }),

  register: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters.',
    }),
    name: Joi.string().trim().min(2).max(100).required(),
    role: Joi.string().valid('admin', 'manager').default('manager'),
  }),

  // Stations
  createStation: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    location: Joi.string().trim().min(1).max(200).required(),
    capacity: Joi.number().integer().min(1).max(100).required(),
    status: Joi.string().valid('active', 'closed').default('active'),
    notes: Joi.string().trim().max(500).allow('', null).optional(),
  }),

  updateStation: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    location: Joi.string().trim().min(1).max(200).optional(),
    capacity: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('active', 'closed').optional(),
    notes: Joi.string().trim().max(500).allow('', null).optional(),
  }).min(1),

  // Schedules
  createSchedule: Joi.object({
    stationId: Joi.string().required(),
    userId: Joi.string().required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required().messages({
      'date.greater': 'End time must be after start time.',
    }),
    notes: Joi.string().trim().max(500).allow('', null).optional(),
  }),

  assignSchedules: Joi.object({
    assignments: Joi.array()
      .items(
        Joi.object({
          stationId: Joi.string().required(),
          userId: Joi.string().required(),
          startTime: Joi.date().iso().required(),
          endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
        })
      )
      .min(1)
      .required(),
  }),

  // Pagination (cursor-based for Firestore)
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    cursor: Joi.string().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    role: Joi.string().valid('admin', 'manager').optional(),
    search: Joi.string().allow('').optional(),
    status: Joi.string().optional(),
  }),

  // ID param
  idParam: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'ID parameter is required.',
    }),
  }),
};

module.exports = { validate, schemas };

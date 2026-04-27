/**
 * Station Validators
 * Joi validation schemas for station API endpoints.
 * Ensures all inputs are sanitized and validated before processing.
 */

const Joi = require('joi');

/**
 * Schema for creating a new station.
 * All required fields must be present.
 */
const createStationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Station name is required',
      'string.min': 'Station name must be at least 2 characters',
      'string.max': 'Station name must not exceed 100 characters',
      'any.required': 'Station name is required',
    }),

  location: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .required()
    .messages({
      'string.empty': 'Location is required',
      'string.min': 'Location must be at least 2 characters',
      'string.max': 'Location must not exceed 150 characters',
      'any.required': 'Location is required',
    }),

  capacity: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required()
    .messages({
      'number.base': 'Capacity must be a number',
      'number.integer': 'Capacity must be a whole number',
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity must not exceed 20',
      'any.required': 'Capacity is required',
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid('active', 'closed')
    .default('active')
    .messages({
      'any.only': "Status must be either 'active' or 'closed'",
    }),

  notes: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .default('')
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
});

/**
 * Schema for updating an existing station.
 * All fields are optional (partial update semantics).
 * At least one field must be provided.
 */
const updateStationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'Station name cannot be empty',
      'string.min': 'Station name must be at least 2 characters',
      'string.max': 'Station name must not exceed 100 characters',
    }),

  location: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .messages({
      'string.empty': 'Location cannot be empty',
      'string.min': 'Location must be at least 2 characters',
      'string.max': 'Location must not exceed 150 characters',
    }),

  capacity: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .messages({
      'number.base': 'Capacity must be a number',
      'number.integer': 'Capacity must be a whole number',
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity must not exceed 20',
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid('active', 'closed')
    .messages({
      'any.only': "Status must be either 'active' or 'closed'",
    }),

  notes: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

/**
 * Schema for validating list/query parameters.
 */
const listStationsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .default('')
    .messages({
      'string.max': 'Search term must not exceed 100 characters',
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid('active', 'closed')
    .allow('', null)
    .messages({
      'any.only': "Status filter must be either 'active' or 'closed'",
    }),

  sortBy: Joi.string()
    .trim()
    .valid('name', 'location', 'capacity', 'status', 'createdAt', 'updatedAt')
    .default('createdAt')
    .messages({
      'any.only': 'sortBy must be one of: name, location, capacity, status, createdAt, updatedAt',
    }),

  sortOrder: Joi.string()
    .trim()
    .lowercase()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': "sortOrder must be either 'asc' or 'desc'",
    }),
});

module.exports = {
  createStationSchema,
  updateStationSchema,
  listStationsQuerySchema,
};

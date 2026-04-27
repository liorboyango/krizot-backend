/**
 * Station Joi Validation Schemas
 * Used by the validateBody middleware to sanitize and validate
 * incoming request bodies for station create/update operations.
 */

const Joi = require('joi');

/**
 * Schema for creating a new station.
 * All required fields must be present.
 */
const createStationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Station name is required',
    'string.max': 'Station name must not exceed 100 characters',
    'any.required': 'Station name is required',
  }),

  location: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Location is required',
    'string.max': 'Location must not exceed 200 characters',
    'any.required': 'Location is required',
  }),

  capacity: Joi.number().integer().min(1).max(20).required().messages({
    'number.base': 'Capacity must be a number',
    'number.integer': 'Capacity must be a whole number',
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 20',
    'any.required': 'Capacity is required',
  }),

  status: Joi.string()
    .valid('ACTIVE', 'CLOSED')
    .default('ACTIVE')
    .messages({
      'any.only': 'Status must be either ACTIVE or CLOSED',
    }),

  notes: Joi.string().trim().max(1000).allow('', null).optional().messages({
    'string.max': 'Notes must not exceed 1000 characters',
  }),
});

/**
 * Schema for updating an existing station.
 * All fields are optional — only provided fields are updated.
 */
const updateStationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional().messages({
    'string.empty': 'Station name cannot be empty',
    'string.max': 'Station name must not exceed 100 characters',
  }),

  location: Joi.string().trim().min(1).max(200).optional().messages({
    'string.empty': 'Location cannot be empty',
    'string.max': 'Location must not exceed 200 characters',
  }),

  capacity: Joi.number().integer().min(1).max(20).optional().messages({
    'number.base': 'Capacity must be a number',
    'number.integer': 'Capacity must be a whole number',
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 20',
  }),

  status: Joi.string()
    .valid('ACTIVE', 'CLOSED')
    .optional()
    .messages({
      'any.only': 'Status must be either ACTIVE or CLOSED',
    }),

  notes: Joi.string().trim().max(1000).allow('', null).optional().messages({
    'string.max': 'Notes must not exceed 1000 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = {
  createStationSchema,
  updateStationSchema,
};

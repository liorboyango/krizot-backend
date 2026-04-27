/**
 * Schedule Validation Schemas
 *
 * Joi schemas for validating schedule-related request payloads.
 */

'use strict';

const Joi = require('joi');

// ─── Reusable Fields ─────────────────────────────────────────────────────────

const isoDatetime = Joi.string().isoDate();

// ─── Schemas ─────────────────────────────────────────────────────────────────

/**
 * POST /api/schedules
 */
const createScheduleSchema = Joi.object({
  stationId: Joi.string().trim().required().messages({
    'any.required': 'Station ID is required',
  }),
  userId: Joi.string().trim().required().messages({
    'any.required': 'User ID is required',
  }),
  startTime: isoDatetime.required().messages({
    'string.isoDate': 'startTime must be a valid ISO 8601 datetime',
    'any.required': 'Start time is required',
  }),
  endTime: isoDatetime.required().messages({
    'string.isoDate': 'endTime must be a valid ISO 8601 datetime',
    'any.required': 'End time is required',
  }),
  notes: Joi.string().trim().max(500).optional().allow(''),
}).custom((value, helpers) => {
  const start = new Date(value.startTime);
  const end = new Date(value.endTime);
  if (end <= start) {
    return helpers.error('any.invalid', { message: 'endTime must be after startTime' });
  }
  // Shift duration: max 24 hours
  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours > 24) {
    return helpers.error('any.invalid', { message: 'Shift duration cannot exceed 24 hours' });
  }
  return value;
}).messages({
  'any.invalid': '{{#message}}',
});

/**
 * PUT /api/schedules/:id
 */
const updateScheduleSchema = Joi.object({
  stationId: Joi.string().trim().optional(),
  userId: Joi.string().trim().optional(),
  startTime: isoDatetime.optional(),
  endTime: isoDatetime.optional(),
  notes: Joi.string().trim().max(500).optional().allow(''),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * POST /api/schedules/assign  (bulk assignment)
 */
const bulkAssignSchema = Joi.object({
  assignments: Joi.array()
    .items(
      Joi.object({
        stationId: Joi.string().trim().required(),
        userId: Joi.string().trim().required(),
        startTime: isoDatetime.required(),
        endTime: isoDatetime.required(),
        notes: Joi.string().trim().max(500).optional().allow(''),
      }).custom((value, helpers) => {
        const start = new Date(value.startTime);
        const end = new Date(value.endTime);
        if (end <= start) {
          return helpers.error('any.invalid', { message: 'endTime must be after startTime' });
        }
        return value;
      }),
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one assignment is required',
      'array.max': 'Cannot assign more than 50 shifts at once',
      'any.required': 'Assignments array is required',
    }),
});

/**
 * GET /api/schedules (query params)
 */
const listSchedulesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  stationId: Joi.string().trim().optional(),
  userId: Joi.string().trim().optional(),
  startDate: isoDatetime.optional(),
  endDate: isoDatetime.optional(),
  sortBy: Joi.string().valid('startTime', 'endTime', 'createdAt').default('startTime'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * URL param :id
 */
const scheduleIdParamSchema = Joi.object({
  id: Joi.string().trim().required().messages({
    'any.required': 'Schedule ID is required',
  }),
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  bulkAssignSchema,
  listSchedulesQuerySchema,
  scheduleIdParamSchema,
};

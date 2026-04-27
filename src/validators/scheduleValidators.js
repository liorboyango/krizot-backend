/**
 * Schedule Validators
 * Joi validation schemas for schedule/shift API endpoints.
 */

const Joi = require('joi');

/**
 * Schema for creating a new schedule.
 */
const createScheduleSchema = Joi.object({
  stationId: Joi.string().uuid().required().messages({
    'string.uuid': 'stationId must be a valid UUID',
    'any.required': 'stationId is required',
  }),
  userId: Joi.string().uuid().allow(null).optional().messages({
    'string.uuid': 'userId must be a valid UUID',
  }),
  startTime: Joi.string().isoDate().required().messages({
    'string.isoDate': 'startTime must be a valid ISO 8601 date-time string',
    'any.required': 'startTime is required',
  }),
  endTime: Joi.string().isoDate().required().messages({
    'string.isoDate': 'endTime must be a valid ISO 8601 date-time string',
    'any.required': 'endTime is required',
  }),
  notes: Joi.string().max(500).allow(null, '').optional(),
});

/**
 * Schema for updating an existing schedule (all fields optional).
 */
const updateScheduleSchema = Joi.object({
  stationId: Joi.string().uuid().optional().messages({
    'string.uuid': 'stationId must be a valid UUID',
  }),
  userId: Joi.string().uuid().allow(null).optional().messages({
    'string.uuid': 'userId must be a valid UUID',
  }),
  startTime: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'startTime must be a valid ISO 8601 date-time string',
  }),
  endTime: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'endTime must be a valid ISO 8601 date-time string',
  }),
  notes: Joi.string().max(500).allow(null, '').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Schema for a single assignment item (used within bulk assign).
 * Supports two modes:
 *   1. Assign to existing schedule: { scheduleId, userId }
 *   2. Create new schedule: { stationId, userId, startTime, endTime, notes? }
 */
const assignmentItemSchema = Joi.alternatives().try(
  // Mode 1: assign to existing schedule
  Joi.object({
    scheduleId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().allow(null).optional(),
  }),
  // Mode 2: create new schedule with assignment
  Joi.object({
    stationId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().allow(null).optional(),
    startTime: Joi.string().isoDate().required(),
    endTime: Joi.string().isoDate().required(),
    notes: Joi.string().max(500).allow(null, '').optional(),
  })
).messages({
  'alternatives.match': 'Each assignment must have either scheduleId or (stationId + startTime + endTime)',
});

/**
 * Schema for bulk shift assignment.
 */
const assignShiftsSchema = Joi.object({
  assignments: Joi.array()
    .items(assignmentItemSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'assignments must contain at least one item',
      'array.max': 'assignments cannot exceed 50 items per request',
      'any.required': 'assignments array is required',
    }),
});

/**
 * Schema for listing schedules (query params).
 */
const listSchedulesSchema = Joi.object({
  stationId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

/**
 * Schema for weekly schedule query params.
 */
const weeklyScheduleSchema = Joi.object({
  weekStart: Joi.string().isoDate().optional(),
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  assignShiftsSchema,
  listSchedulesSchema,
  weeklyScheduleSchema,
};

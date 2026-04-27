/**
 * Schedule Validators
 * Joi schemas for schedule-related request validation.
 */

'use strict';

const Joi = require('joi');

const createScheduleSchema = Joi.object({
  stationId: Joi.string().required().messages({
    'any.required': 'Station ID is required',
  }),
  userId: Joi.string().required().messages({
    'any.required': 'User ID is required',
  }),
  startTime: Joi.date().iso().required().messages({
    'any.required': 'Start time is required',
    'date.format': 'Start time must be a valid ISO 8601 date',
  }),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required().messages({
    'any.required': 'End time is required',
    'date.greater': 'End time must be after start time',
  }),
});

const updateScheduleSchema = Joi.object({
  stationId: Joi.string(),
  userId: Joi.string(),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
}).min(1);

const assignmentItemSchema = Joi.object({
  stationId: Joi.string().required(),
  userId: Joi.string().required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
});

const assignScheduleSchema = Joi.object({
  assignments: Joi.array()
    .items(assignmentItemSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': 'Assignments array is required',
      'array.min': 'At least one assignment is required',
      'array.max': 'Cannot process more than 50 assignments at once',
    }),
});

const scheduleIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'any.required': 'Schedule ID is required',
  }),
});

const listSchedulesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20),
  stationId: Joi.string(),
  userId: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  assignScheduleSchema,
  scheduleIdParamSchema,
  listSchedulesQuerySchema,
};

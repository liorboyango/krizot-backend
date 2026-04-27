/**
 * Station Validators
 * Joi schemas for station-related request validation.
 */

'use strict';

const Joi = require('joi');

const createStationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Station name is required',
    'string.min': 'Station name must be at least 2 characters',
  }),
  location: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Location is required',
  }),
  capacity: Joi.number().integer().min(1).max(20).required().messages({
    'any.required': 'Capacity is required',
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 20',
  }),
  status: Joi.string().valid('active', 'closed').default('active'),
  notes: Joi.string().trim().max(500).allow('', null),
});

const updateStationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  location: Joi.string().trim().min(2).max(200),
  capacity: Joi.number().integer().min(1).max(20),
  status: Joi.string().valid('active', 'closed'),
  notes: Joi.string().trim().max(500).allow('', null),
}).min(1);

const stationIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'any.required': 'Station ID is required',
  }),
});

const listStationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100),
  status: Joi.string().valid('active', 'closed'),
});

module.exports = {
  createStationSchema,
  updateStationSchema,
  stationIdParamSchema,
  listStationsQuerySchema,
};

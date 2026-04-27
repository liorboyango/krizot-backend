/**
 * Station Validation Schemas
 *
 * Joi schemas for validating station-related request payloads.
 */

'use strict';

const Joi = require('joi');

// ─── Schemas ─────────────────────────────────────────────────────────────────

/**
 * POST /api/stations
 */
const createStationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Station name must be at least 2 characters',
    'string.max': 'Station name must not exceed 100 characters',
    'any.required': 'Station name is required',
  }),
  location: Joi.string().trim().min(2).max(200).required().messages({
    'string.min': 'Location must be at least 2 characters',
    'any.required': 'Location is required',
  }),
  capacity: Joi.number().integer().min(1).max(100).required().messages({
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 100',
    'any.required': 'Capacity is required',
  }),
  status: Joi.string().valid('active', 'closed', 'maintenance').default('active'),
  notes: Joi.string().trim().max(500).optional().allow(''),
});

/**
 * PUT /api/stations/:id
 */
const updateStationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  location: Joi.string().trim().min(2).max(200).optional(),
  capacity: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('active', 'closed', 'maintenance').optional(),
  notes: Joi.string().trim().max(500).optional().allow(''),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * GET /api/stations (query params)
 */
const listStationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'closed', 'maintenance').optional(),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().valid('name', 'location', 'capacity', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * URL param :id
 */
const stationIdParamSchema = Joi.object({
  id: Joi.string().trim().required().messages({
    'any.required': 'Station ID is required',
  }),
});

module.exports = {
  createStationSchema,
  updateStationSchema,
  listStationsQuerySchema,
  stationIdParamSchema,
};

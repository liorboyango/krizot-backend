/**
 * Validation Module Index
 *
 * Re-exports all validation schemas and middleware for convenient imports.
 */

'use strict';

const { validate, validateRequest } = require('../middleware/validate');
const userSchemas = require('./schemas/userSchemas');
const stationSchemas = require('./schemas/stationSchemas');
const scheduleSchemas = require('./schemas/scheduleSchemas');

module.exports = {
  validate,
  validateRequest,
  userSchemas,
  stationSchemas,
  scheduleSchemas,
};

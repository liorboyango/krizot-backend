/**
 * Validation Middleware
 * Joi schemas for validating request bodies across all routes.
 */

const Joi = require('joi');

// ─── Station Schemas ─────────────────────────────────────────────────────────

const stationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  location: Joi.string().trim().min(1).max(200).required(),
  capacity: Joi.number().integer().min(1).max(100).required(),
  status: Joi.string().valid('ACTIVE', 'CLOSED').default('ACTIVE'),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
});

const stationUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  location: Joi.string().trim().min(1).max(200).optional(),
  capacity: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('ACTIVE', 'CLOSED').optional(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
}).min(1);

// ─── Schedule Schemas ─────────────────────────────────────────────────────────

const scheduleSchema = Joi.object({
  stationId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().allow(null).optional(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
});

const scheduleUpdateSchema = Joi.object({
  stationId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().allow(null).optional(),
  startTime: Joi.date().iso().optional(),
  endTime: Joi.date().iso().optional(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
}).min(1);

const bulkAssignSchema = Joi.object({
  assignments: Joi.array()
    .items(
      Joi.object({
        stationId: Joi.string().uuid().required(),
        userId: Joi.string().uuid().allow(null).optional(),
        startTime: Joi.date().iso().required(),
        endTime: Joi.date().iso().required(),
        notes: Joi.string().trim().max(500).allow('', null).optional(),
      })
    )
    .min(1)
    .max(50)
    .required(),
});

// ─── User Schemas ─────────────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  role: Joi.string().valid('admin', 'manager').default('manager'),
});

const userUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  role: Joi.string().valid('admin', 'manager').optional(),
  password: Joi.string().min(8).max(128).optional(),
}).min(1);

// ─── Validator Functions ──────────────────────────────────────────────────────

/**
 * Validate station creation body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateStation(data) {
  return stationSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate station update body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateStationUpdate(data) {
  return stationUpdateSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate schedule creation or update body.
 * @param {Object} data
 * @param {boolean} isUpdate - If true, use partial update schema
 * @returns {Joi.ValidationResult}
 */
function validateSchedule(data, isUpdate) {
  const schema = isUpdate ? scheduleUpdateSchema : scheduleSchema;
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate bulk assignment body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateBulkAssign(data) {
  return bulkAssignSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate login body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateLogin(data) {
  return loginSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate user registration body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateRegister(data) {
  return registerSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

/**
 * Validate user update body.
 * @param {Object} data
 * @returns {Joi.ValidationResult}
 */
function validateUserUpdate(data) {
  return userUpdateSchema.validate(data, { abortEarly: false, stripUnknown: true });
}

module.exports = {
  validateStation,
  validateStationUpdate,
  validateSchedule,
  validateBulkAssign,
  validateLogin,
  validateRegister,
  validateUserUpdate,
};

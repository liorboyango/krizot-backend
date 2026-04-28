/**
 * User Validation Schemas
 *
 * Joi schemas for validating user-related request payloads.
 */

'use strict';

const Joi = require('joi');

// ─── Reusable Fields ─────────────────────────────────────────────────────────

const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim().max(255);
const password = Joi.string().min(8).max(128);
const role = Joi.string().valid('admin', 'manager');

// ─── Schemas ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * The client signs in with the Firebase Client SDK and forwards the resulting
 * ID token to the backend, which verifies it via the Admin SDK.
 */
const loginSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'idToken is required',
  }),
});

/**
 * POST /api/auth/register  (admin only)
 */
const registerSchema = Joi.object({
  email: email.required(),
  password: password
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'password complexity')
    .required()
    .messages({
      'string.pattern.name': 'Password must contain uppercase, lowercase, and a number',
      'string.min': 'Password must be at least 8 characters',
    }),
  name: Joi.string().trim().min(2).max(100).required(),
  role: role.default('manager'),
});

/**
 * PUT /api/users/:id
 */
const updateUserSchema = Joi.object({
  email: email.optional(),
  name: Joi.string().trim().min(2).max(100).optional(),
  role: role.optional(),
  password: password
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'password complexity')
    .optional()
    .messages({
      'string.pattern.name': 'Password must contain uppercase, lowercase, and a number',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * GET /api/users (query params)
 */
const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: role.optional(),
  search: Joi.string().trim().max(100).optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
  updateUserSchema,
  listUsersQuerySchema,
};

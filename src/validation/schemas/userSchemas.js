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
 */
const loginSchema = Joi.object({
  email: email.required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: password.required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
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
 * POST /api/auth/refresh
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
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
  refreshTokenSchema,
  listUsersQuerySchema,
};

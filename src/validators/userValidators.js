/**
 * User Validators
 * Joi schemas for user-related request validation.
 */

'use strict';

const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
  }),
  role: Joi.string().valid('admin', 'manager').default('manager'),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid('admin', 'manager'),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
}).min(1);

const userIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'any.required': 'User ID is required',
  }),
});

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100),
  role: Joi.string().valid('admin', 'manager'),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
};

/**
 * User Controller
 * Handles CRUD operations for user management.
 */

'use strict';

const userService = require('../services/userService');
const { sendSuccess, sendCreated, sendNoContent, sendPaginated } = require('../utils/response');
const { AppError } = require('../utils/errors');

/**
 * GET /api/users
 * List all users with pagination.
 */
async function listUsers(req, res, next) {
  try {
    const { page = 1, perPage = 20, search, role } = req.query;
    const result = await userService.listUsers({
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      search,
      role,
    });
    sendPaginated(res, result.users, result.pagination);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users
 * Create a new user.
 */
async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    sendCreated(res, user, 'User created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id
 * Get a single user by ID.
 */
async function getUserById(req, res, next) {
  try {
    // Allow users to view their own profile; admins can view any
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id
 * Update a user.
 */
async function updateUser(req, res, next) {
  try {
    // Allow users to update their own profile; admins can update any
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    const user = await userService.updateUser(req.params.id, req.body);
    sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Soft-delete a user.
 */
async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, createUser, getUserById, updateUser, deleteUser };

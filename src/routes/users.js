/**
 * User Routes
 * CRUD operations for user management (admin only for most operations).
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const userController = require('../controllers/userController');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} = require('../validators/userValidators');

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    List all users (paginated)
 * @access  Private (admin)
 */
router.get(
  '/',
  authorize('admin'),
  validateQuery(listUsersQuerySchema),
  userController.listUsers
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (admin)
 */
router.post(
  '/',
  authorize('admin'),
  validateBody(createUserSchema),
  userController.createUser
);

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Private (admin or self)
 */
router.get(
  '/:id',
  validateParams(userIdParamSchema),
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user
 * @access  Private (admin or self)
 */
router.put(
  '/:id',
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user (soft delete)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  validateParams(userIdParamSchema),
  userController.deleteUser
);

module.exports = router;

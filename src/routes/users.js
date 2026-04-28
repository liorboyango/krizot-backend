/**
 * User Routes
 *
 * GET    /api/users        - List all users (admin only)
 * GET    /api/users/:id    - Get a single user
 * PUT    /api/users/:id    - Update user profile
 * DELETE /api/users/:id    - Delete a user (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

router.get(
  '/',
  authenticate,
  authorize('admin'),
  validate({ query: schemas.pagination }),
  async (req, res, next) => {
    try {
      const { limit = 20, cursor, role } = req.query;
      const result = await userModel.listUsers({
        limit: Number(limit),
        role,
        cursor,
      });
      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: { limit: Number(limit), nextCursor: result.nextCursor },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
        throw new AppError('Access denied. You can only view your own profile.', 403);
      }
      const user = await userModel.findUserById(req.params.id);
      if (!user) throw new NotFoundError('User');
      res.status(200).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
        throw new AppError('Access denied. You can only update your own profile.', 403);
      }

      const existing = await userModel.findUserById(req.params.id);
      if (!existing) throw new NotFoundError('User');

      const updates = {};
      if (req.body.name) updates.name = req.body.name.trim();
      if (req.body.email) updates.email = req.body.email.toLowerCase().trim();
      if (req.body.role && req.user.role === 'admin') updates.role = req.body.role;
      if (req.body.password) {
        if (req.body.password.length < 8) {
          throw new AppError('Password must be at least 8 characters.', 400);
        }
        updates.password = req.body.password;
      }
      if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields provided for update.', 400);
      }

      const user = await userModel.updateUser(req.params.id, updates);
      logger.info(`User ${req.params.id} updated by ${req.user.email}`);
      res.status(200).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      if (req.user.id === req.params.id) {
        throw new AppError('You cannot delete your own account.', 400);
      }
      const existing = await userModel.findUserById(req.params.id);
      if (!existing) throw new NotFoundError('User');

      await userModel.deleteUser(req.params.id);
      logger.info(`User ${req.params.id} deleted by ${req.user.email}`);
      res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

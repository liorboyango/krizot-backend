/**
 * User Routes
 *
 * GET    /api/users        - List all users (admin only)
 * GET    /api/users/:id    - Get a single user
 * PUT    /api/users/:id    - Update user profile
 * DELETE /api/users/:id    - Delete a user (admin only)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/users
 * @desc    List all users (admin only)
 * @access  Private (admin)
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  validate({ query: schemas.pagination }),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { schedules: true } },
          },
        }),
        prisma.user.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Private (admin or own profile)
 */
router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      // Users can only view their own profile unless they are admin
      if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
        throw new AppError('Access denied. You can only view your own profile.', 403);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { schedules: true } },
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile
 * @access  Private (admin or own profile)
 */
router.put(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      // Users can only update their own profile unless they are admin
      if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
        throw new AppError('Access denied. You can only update your own profile.', 403);
      }

      const existing = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('User');
      }

      const updateData = {};

      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.email) updateData.email = req.body.email.toLowerCase().trim();

      // Only admin can change roles
      if (req.body.role && req.user.role === 'admin') {
        updateData.role = req.body.role;
      }

      // Handle password change
      if (req.body.password) {
        if (req.body.password.length < 8) {
          throw new AppError('Password must be at least 8 characters.', 400);
        }
        updateData.password = await bcrypt.hash(req.body.password, 12);
      }

      if (Object.keys(updateData).length === 0) {
        throw new AppError('No valid fields provided for update.', 400);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });

      logger.info(`User ${req.params.id} updated by ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user (admin only)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      // Prevent admin from deleting themselves
      if (req.user.id === req.params.id) {
        throw new AppError('You cannot delete your own account.', 400);
      }

      const existing = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('User');
      }

      await prisma.user.delete({ where: { id: req.params.id } });

      logger.info(`User ${req.params.id} deleted by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

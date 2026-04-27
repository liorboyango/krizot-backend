/**
 * Station Routes
 *
 * GET    /api/stations        - List all stations (paginated)
 * POST   /api/stations        - Create a new station
 * GET    /api/stations/:id    - Get a single station
 * PUT    /api/stations/:id    - Update a station
 * DELETE /api/stations/:id    - Delete a station (admin only)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/stations
 * @desc    List all stations with pagination
 * @access  Private (JWT required)
 * @query   page, limit, sortBy, sortOrder
 */
router.get(
  '/',
  authenticate,
  validate({ query: schemas.pagination }),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [stations, total] = await Promise.all([
        prisma.station.findMany({
          skip,
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: { select: { schedules: true } },
          },
        }),
        prisma.station.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          stations,
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
 * @route   POST /api/stations
 * @desc    Create a new station
 * @access  Private (admin or manager)
 * @body    { name, location, capacity, status?, notes? }
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.createStation }),
  async (req, res, next) => {
    try {
      const { name, location, capacity, status = 'active', notes } = req.body;

      const station = await prisma.station.create({
        data: { name, location, capacity, status, notes },
      });

      logger.info(`Station created: ${station.name} by user ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: { station },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/stations/:id
 * @desc    Get a single station by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      const station = await prisma.station.findUnique({
        where: { id: req.params.id },
        include: {
          schedules: {
            orderBy: { startTime: 'asc' },
            take: 10,
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { schedules: true } },
        },
      });

      if (!station) {
        throw new NotFoundError('Station');
      }

      res.status(200).json({
        success: true,
        data: { station },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/stations/:id
 * @desc    Update a station
 * @access  Private (admin or manager)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate({ params: schemas.idParam, body: schemas.updateStation }),
  async (req, res, next) => {
    try {
      const existing = await prisma.station.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('Station');
      }

      const station = await prisma.station.update({
        where: { id: req.params.id },
        data: req.body,
      });

      logger.info(`Station updated: ${station.name} by user ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { station },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/stations/:id
 * @desc    Delete a station (admin only)
 * @access  Private (admin role required)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      const existing = await prisma.station.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('Station');
      }

      await prisma.station.delete({ where: { id: req.params.id } });

      logger.info(`Station deleted: ${existing.name} by user ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Station deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

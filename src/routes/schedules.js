/**
 * Schedule Routes
 *
 * GET  /api/schedules          - List schedules (paginated, filterable)
 * POST /api/schedules          - Create a single schedule
 * GET  /api/schedules/:id      - Get a single schedule
 * PUT  /api/schedules/:id      - Update a schedule
 * DELETE /api/schedules/:id    - Delete a schedule (admin only)
 * POST /api/schedules/assign   - Bulk assign shifts with conflict detection
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
 * @route   GET /api/schedules
 * @desc    List schedules with optional filters
 * @access  Private
 * @query   page, limit, stationId, userId, startDate, endDate
 */
router.get(
  '/',
  authenticate,
  async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        stationId,
        userId,
        startDate,
        endDate,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where = {};
      if (stationId) where.stationId = stationId;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) where.startTime.gte = new Date(startDate);
        if (endDate) where.startTime.lte = new Date(endDate);
      }

      const [schedules, total] = await Promise.all([
        prisma.schedule.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { startTime: 'asc' },
          include: {
            station: { select: { id: true, name: true, location: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.schedule.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          schedules,
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
 * @route   POST /api/schedules
 * @desc    Create a single schedule entry
 * @access  Private (admin or manager)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.createSchedule }),
  async (req, res, next) => {
    try {
      const { stationId, userId, startTime, endTime, notes } = req.body;

      // Check for scheduling conflicts for this user
      const conflict = await prisma.schedule.findFirst({
        where: {
          userId,
          OR: [
            { startTime: { lt: new Date(endTime), gte: new Date(startTime) } },
            { endTime: { gt: new Date(startTime), lte: new Date(endTime) } },
            {
              startTime: { lte: new Date(startTime) },
              endTime: { gte: new Date(endTime) },
            },
          ],
        },
        include: { station: { select: { name: true } } },
      });

      if (conflict) {
        throw new AppError(
          `Scheduling conflict: User is already assigned to station "${conflict.station.name}" during this time period.`,
          409
        );
      }

      const schedule = await prisma.schedule.create({
        data: {
          stationId,
          userId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          notes,
        },
        include: {
          station: { select: { id: true, name: true, location: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      logger.info(`Schedule created for station ${stationId} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: { schedule },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/schedules/:id
 * @desc    Get a single schedule by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: req.params.id },
        include: {
          station: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      if (!schedule) {
        throw new NotFoundError('Schedule');
      }

      res.status(200).json({
        success: true,
        data: { schedule },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a schedule
 * @access  Private (admin or manager)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      const existing = await prisma.schedule.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('Schedule');
      }

      const { stationId, userId, startTime, endTime, notes } = req.body;

      const schedule = await prisma.schedule.update({
        where: { id: req.params.id },
        data: {
          ...(stationId && { stationId }),
          ...(userId && { userId }),
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          station: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      logger.info(`Schedule ${req.params.id} updated by ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { schedule },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a schedule (admin only)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  async (req, res, next) => {
    try {
      const existing = await prisma.schedule.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new NotFoundError('Schedule');
      }

      await prisma.schedule.delete({ where: { id: req.params.id } });

      logger.info(`Schedule ${req.params.id} deleted by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   POST /api/schedules/assign
 * @desc    Bulk assign shifts with conflict detection
 * @access  Private (admin or manager)
 * @body    { assignments: [{ stationId, userId, startTime, endTime }] }
 */
router.post(
  '/assign',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.assignSchedules }),
  async (req, res, next) => {
    try {
      const { assignments } = req.body;

      const results = { created: [], conflicts: [] };

      // Process each assignment, detecting conflicts
      for (const assignment of assignments) {
        const { stationId, userId, startTime, endTime } = assignment;

        // Check for user conflict
        const conflict = await prisma.schedule.findFirst({
          where: {
            userId,
            OR: [
              { startTime: { lt: new Date(endTime), gte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime), lte: new Date(endTime) } },
              {
                startTime: { lte: new Date(startTime) },
                endTime: { gte: new Date(endTime) },
              },
            ],
          },
          include: { station: { select: { name: true } } },
        });

        if (conflict) {
          results.conflicts.push({
            assignment,
            reason: `User already assigned to "${conflict.station.name}" during this period.`,
          });
          continue;
        }

        const schedule = await prisma.schedule.create({
          data: {
            stationId,
            userId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
          },
          include: {
            station: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        });

        results.created.push(schedule);
      }

      logger.info(
        `Bulk assign: ${results.created.length} created, ${results.conflicts.length} conflicts by ${req.user.email}`
      );

      const statusCode = results.conflicts.length > 0 && results.created.length === 0 ? 409 : 201;

      res.status(statusCode).json({
        success: results.created.length > 0,
        data: results,
        message: `${results.created.length} assignment(s) created. ${results.conflicts.length} conflict(s) detected.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

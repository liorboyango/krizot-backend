/**
 * Schedule Routes
 * CRUD operations for shift scheduling and assignments.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const scheduleController = require('../controllers/scheduleController');
const {
  createScheduleSchema,
  updateScheduleSchema,
  assignScheduleSchema,
  scheduleIdParamSchema,
  listSchedulesQuerySchema,
} = require('../validators/scheduleValidators');

// All schedule routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/schedules
 * @desc    List schedules (paginated, filterable by date/station/user)
 * @access  Private (JWT)
 */
router.get(
  '/',
  validateQuery(listSchedulesQuerySchema),
  scheduleController.listSchedules
);

/**
 * @route   POST /api/schedules
 * @desc    Create a new schedule entry
 * @access  Private (admin, manager)
 */
router.post(
  '/',
  authorize('admin', 'manager'),
  validateBody(createScheduleSchema),
  scheduleController.createSchedule
);

/**
 * @route   POST /api/schedules/assign
 * @desc    Bulk assign users to shifts with conflict validation
 * @access  Private (admin, manager)
 */
router.post(
  '/assign',
  authorize('admin', 'manager'),
  validateBody(assignScheduleSchema),
  scheduleController.assignSchedule
);

/**
 * @route   GET /api/schedules/:id
 * @desc    Get a single schedule entry by ID
 * @access  Private (JWT)
 */
router.get(
  '/:id',
  validateParams(scheduleIdParamSchema),
  scheduleController.getScheduleById
);

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a schedule entry
 * @access  Private (admin, manager)
 */
router.put(
  '/:id',
  authorize('admin', 'manager'),
  validateParams(scheduleIdParamSchema),
  validateBody(updateScheduleSchema),
  scheduleController.updateSchedule
);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a schedule entry
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  validateParams(scheduleIdParamSchema),
  scheduleController.deleteSchedule
);

module.exports = router;

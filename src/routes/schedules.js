/**
 * Schedule Routes
 * Defines all HTTP routes for shift scheduling and assignment endpoints.
 * All routes require JWT authentication.
 */

const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  createScheduleSchema,
  updateScheduleSchema,
  assignShiftsSchema,
  listSchedulesSchema,
  weeklyScheduleSchema,
} = require('../validators/scheduleValidators');

// All schedule routes require authentication
router.use(authenticate);

/**
 * GET /api/schedules/stats
 * Dashboard statistics for today (or a given date).
 * Query: { date? } ISO date string
 */
router.get('/stats', scheduleController.getStats);

/**
 * GET /api/schedules/week
 * Weekly schedule grid for all active stations.
 * Query: { weekStart? } ISO date string (Monday)
 */
router.get('/week', validate(weeklyScheduleSchema, 'query'), scheduleController.getWeeklySchedule);

/**
 * GET /api/schedules
 * List schedules with optional filters.
 * Query: { stationId?, userId?, startDate?, endDate?, page?, limit? }
 */
router.get('/', validate(listSchedulesSchema, 'query'), scheduleController.listSchedules);

/**
 * GET /api/schedules/:id
 * Get a single schedule by ID.
 */
router.get('/:id', scheduleController.getSchedule);

/**
 * POST /api/schedules/assign
 * Bulk assign users to shifts (with conflict detection).
 * Body: { assignments: [{ scheduleId, userId } | { stationId, userId, startTime, endTime }] }
 * Requires admin or manager role.
 */
router.post(
  '/assign',
  requireRole(['admin', 'manager']),
  validate(assignShiftsSchema),
  scheduleController.assignShifts
);

/**
 * POST /api/schedules
 * Create a new schedule/shift.
 * Body: { stationId, userId?, startTime, endTime, notes? }
 * Requires admin or manager role.
 */
router.post(
  '/',
  requireRole(['admin', 'manager']),
  validate(createScheduleSchema),
  scheduleController.createSchedule
);

/**
 * PUT /api/schedules/:id
 * Update an existing schedule.
 * Body: { stationId?, userId?, startTime?, endTime?, notes? }
 * Requires admin or manager role.
 */
router.put(
  '/:id',
  requireRole(['admin', 'manager']),
  validate(updateScheduleSchema),
  scheduleController.updateSchedule
);

/**
 * POST /api/schedules/:id/unassign
 * Remove user assignment from a schedule.
 * Requires admin or manager role.
 */
router.post(
  '/:id/unassign',
  requireRole(['admin', 'manager']),
  scheduleController.unassignShift
);

/**
 * DELETE /api/schedules/:id
 * Delete a schedule.
 * Requires admin role only.
 */
router.delete(
  '/:id',
  requireRole(['admin']),
  scheduleController.deleteSchedule
);

module.exports = router;

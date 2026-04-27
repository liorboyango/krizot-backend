/**
 * Schedules Router
 * Defines all /api/schedules routes.
 * All routes require JWT authentication.
 *
 * Route order matters:
 *   /stats and /weekly and /assign must be defined BEFORE /:id
 *   to prevent Express from treating them as ID parameters.
 */

const express = require('express');
const router = express.Router();
const schedulesController = require('../controllers/schedulesController');
const { authenticate, requireRole } = require('../middleware/auth');

// All schedule routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/schedules/stats
 * @desc    Get scheduling statistics for dashboard stat cards
 * @access  Private (admin, manager)
 */
router.get('/stats', schedulesController.getScheduleStats);

/**
 * @route   GET /api/schedules/weekly
 * @desc    Get weekly schedule grid
 * @query   weekStart - ISO date string (optional, defaults to current week Monday)
 * @access  Private
 */
router.get('/weekly', schedulesController.getWeeklySchedule);

/**
 * @route   POST /api/schedules/assign
 * @desc    Bulk assign shifts to stations/users with conflict detection
 * @body    { assignments: [{ stationId, userId, startTime, endTime, notes? }] }
 * @access  Private (admin, manager)
 */
router.post('/assign', requireRole(['admin', 'manager']), schedulesController.assignShifts);

/**
 * @route   GET /api/schedules
 * @desc    List schedules with optional filters
 * @query   stationId, userId, startDate, endDate, page, limit
 * @access  Private
 */
router.get('/', schedulesController.listSchedules);

/**
 * @route   POST /api/schedules
 * @desc    Create a new schedule entry
 * @body    { stationId, userId?, startTime, endTime, notes? }
 * @access  Private (admin, manager)
 */
router.post('/', requireRole(['admin', 'manager']), schedulesController.createSchedule);

/**
 * @route   GET /api/schedules/:id
 * @desc    Get a single schedule by ID
 * @access  Private
 */
router.get('/:id', schedulesController.getSchedule);

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a schedule entry
 * @body    Partial schedule fields
 * @access  Private (admin, manager)
 */
router.put('/:id', requireRole(['admin', 'manager']), schedulesController.updateSchedule);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a schedule entry
 * @access  Private (admin only)
 */
router.delete('/:id', requireRole(['admin']), schedulesController.deleteSchedule);

module.exports = router;

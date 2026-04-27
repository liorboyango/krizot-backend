/**
 * Schedules Controller
 * Handles HTTP requests for shift scheduling and assignments.
 * Delegates business logic to the schedules service.
 */

const schedulesService = require('../services/schedulesService');
const { validateSchedule, validateBulkAssign } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * GET /api/schedules
 * List schedules with optional filters: stationId, userId, startDate, endDate, page, limit
 */
async function listSchedules(req, res, next) {
  try {
    const {
      stationId,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = {};
    if (stationId) filters.stationId = stationId;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const result = await schedulesService.listSchedules(filters, pageNum, limitNum);

    return res.status(200).json({
      success: true,
      data: result.schedules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (err) {
    logger.error('listSchedules error', { error: err.message });
    next(err);
  }
}

/**
 * GET /api/schedules/:id
 * Get a single schedule by ID
 */
async function getSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const schedule = await schedulesService.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    return res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    logger.error('getSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

/**
 * POST /api/schedules
 * Create a new schedule entry
 * Body: { stationId, userId?, startTime, endTime, notes? }
 */
async function createSchedule(req, res, next) {
  try {
    const { error, value } = validateSchedule(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }

    const schedule = await schedulesService.createSchedule(value, req.user);

    logger.info('Schedule created', { scheduleId: schedule.id, createdBy: req.user.id });

    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    if (err.code === 'CONFLICT') {
      return res.status(409).json({
        success: false,
        message: err.message,
        conflicts: err.conflicts || [],
      });
    }
    logger.error('createSchedule error', { error: err.message });
    next(err);
  }
}

/**
 * PUT /api/schedules/:id
 * Update an existing schedule
 * Body: { stationId?, userId?, startTime?, endTime?, notes? }
 */
async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { error, value } = validateSchedule(req.body, true);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }

    const existing = await schedulesService.getScheduleById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    const updated = await schedulesService.updateSchedule(id, value, req.user);

    logger.info('Schedule updated', { scheduleId: id, updatedBy: req.user.id });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err.code === 'CONFLICT') {
      return res.status(409).json({
        success: false,
        message: err.message,
        conflicts: err.conflicts || [],
      });
    }
    logger.error('updateSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

/**
 * DELETE /api/schedules/:id
 * Delete a schedule entry
 */
async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await schedulesService.getScheduleById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    await schedulesService.deleteSchedule(id);

    logger.info('Schedule deleted', { scheduleId: id, deletedBy: req.user.id });

    return res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (err) {
    logger.error('deleteSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

/**
 * POST /api/schedules/assign
 * Bulk assign shifts to stations/users with conflict detection
 * Body: { assignments: [{ stationId, userId, startTime, endTime, notes? }] }
 */
async function assignShifts(req, res, next) {
  try {
    const { error, value } = validateBulkAssign(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }

    const result = await schedulesService.bulkAssignShifts(value.assignments, req.user);

    logger.info('Bulk shift assignment', {
      total: value.assignments.length,
      created: result.created.length,
      conflicts: result.conflicts.length,
      assignedBy: req.user.id,
    });

    const statusCode = result.conflicts.length > 0 ? 207 : 201;

    return res.status(statusCode).json({
      success: result.conflicts.length === 0,
      message:
        result.conflicts.length === 0
          ? 'All shifts assigned successfully'
          : `${result.created.length} shifts assigned, ${result.conflicts.length} conflicts detected`,
      data: {
        created: result.created,
        conflicts: result.conflicts,
      },
    });
  } catch (err) {
    logger.error('assignShifts error', { error: err.message });
    next(err);
  }
}

/**
 * GET /api/schedules/weekly
 * Get weekly schedule grid for dashboard view
 * Query: weekStart (ISO date string, defaults to current week Monday)
 */
async function getWeeklySchedule(req, res, next) {
  try {
    const { weekStart } = req.query;

    let startDate;
    if (weekStart) {
      startDate = new Date(weekStart);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid weekStart date format. Use ISO 8601 (e.g. 2024-04-27)',
        });
      }
    } else {
      // Default to current week Monday
      startDate = new Date();
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    }

    const weeklyData = await schedulesService.getWeeklySchedule(startDate);

    return res.status(200).json({
      success: true,
      data: weeklyData,
    });
  } catch (err) {
    logger.error('getWeeklySchedule error', { error: err.message });
    next(err);
  }
}

/**
 * GET /api/schedules/stats
 * Get scheduling statistics for dashboard stat cards
 */
async function getScheduleStats(req, res, next) {
  try {
    const stats = await schedulesService.getScheduleStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    logger.error('getScheduleStats error', { error: err.message });
    next(err);
  }
}

module.exports = {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  assignShifts,
  getWeeklySchedule,
  getScheduleStats,
};

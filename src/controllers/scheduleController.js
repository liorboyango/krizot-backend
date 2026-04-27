/**
 * Schedule Controller
 * Handles HTTP requests for shift scheduling and assignments.
 * Delegates business logic to the schedule service.
 */

const scheduleService = require('../services/scheduleService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/schedules
 * List schedules with optional filters (stationId, userId, startDate, endDate, week)
 */
async function listSchedules(req, res, next) {
  try {
    const {
      stationId,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {};
    if (stationId) filters.stationId = stationId;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const { schedules, total } = await scheduleService.listSchedules(filters, skip, limitNum);

    res.json({
      success: true,
      data: schedules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
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
    const schedule = await scheduleService.getScheduleById(id);

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/schedules
 * Create a new schedule (single shift)
 * Body: { stationId, userId, startTime, endTime, notes? }
 */
async function createSchedule(req, res, next) {
  try {
    const { stationId, userId, startTime, endTime, notes } = req.body;

    const schedule = await scheduleService.createSchedule({
      stationId,
      userId: userId || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes: notes || null,
    });

    logger.info(`Schedule created: ${schedule.id} by user ${req.user.id}`);

    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
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
    const { stationId, userId, startTime, endTime, notes } = req.body;

    const existing = await scheduleService.getScheduleById(id);
    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    const updateData = {};
    if (stationId !== undefined) updateData.stationId = stationId;
    if (userId !== undefined) updateData.userId = userId;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await scheduleService.updateSchedule(id, updateData);

    logger.info(`Schedule updated: ${id} by user ${req.user.id}`);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await scheduleService.getScheduleById(id);
    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    await scheduleService.deleteSchedule(id);

    logger.info(`Schedule deleted: ${id} by user ${req.user.id}`);

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/schedules/assign
 * Bulk assign users to shifts with conflict detection
 * Body: { assignments: [{ scheduleId, userId }] }
 * OR create new shifts: { assignments: [{ stationId, userId, startTime, endTime }] }
 */
async function assignShifts(req, res, next) {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new AppError('assignments must be a non-empty array', 400);
    }

    if (assignments.length > 50) {
      throw new AppError('Cannot process more than 50 assignments at once', 400);
    }

    const result = await scheduleService.bulkAssign(assignments);

    logger.info(
      `Bulk assignment processed: ${result.succeeded.length} succeeded, ${result.failed.length} failed by user ${req.user.id}`
    );

    const statusCode = result.failed.length === 0 ? 200 : 207; // 207 Multi-Status
    res.status(statusCode).json({
      success: result.failed.length === 0,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schedules/stats
 * Get schedule statistics for dashboard
 * Query: { date? } - defaults to today
 */
async function getStats(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const stats = await scheduleService.getDashboardStats(targetDate);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schedules/week
 * Get weekly schedule grid (stations x days)
 * Query: { weekStart } - ISO date string for Monday of the week
 */
async function getWeeklySchedule(req, res, next) {
  try {
    const { weekStart } = req.query;

    let startDate;
    if (weekStart) {
      startDate = new Date(weekStart);
    } else {
      // Default to current week Monday
      startDate = new Date();
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    }

    const weeklyData = await scheduleService.getWeeklySchedule(startDate);

    res.json({ success: true, data: weeklyData });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/schedules/:id/unassign
 * Remove user assignment from a schedule (set userId to null)
 */
async function unassignShift(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await scheduleService.getScheduleById(id);
    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    const updated = await scheduleService.updateSchedule(id, { userId: null });

    logger.info(`Schedule ${id} unassigned by user ${req.user.id}`);

    res.json({ success: true, data: updated });
  } catch (err) {
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
  getStats,
  getWeeklySchedule,
  unassignShift,
};

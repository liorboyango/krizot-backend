/**
 * Schedules Controller
 * HTTP layer for shift scheduling and assignments.
 * Validation is handled by the `validate` middleware on the routes.
 */

'use strict';

const schedulesService = require('../services/schedulesService');
const logger = require('../utils/logger');

async function listSchedules(req, res, next) {
  try {
    const { stationId, userId, startDate, endDate, limit = 20, cursor } = req.query;

    const filters = {};
    if (stationId) filters.stationId = stationId;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const result = await schedulesService.listSchedules(filters, limitNum, cursor);

    return res.status(200).json({
      success: true,
      data: result.schedules,
      pagination: { limit: limitNum, nextCursor: result.nextCursor },
    });
  } catch (err) {
    logger.error('listSchedules error', { error: err.message });
    next(err);
  }
}

async function getSchedule(req, res, next) {
  try {
    const schedule = await schedulesService.getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    return res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    logger.error('getSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    const schedule = await schedulesService.createSchedule(req.body, req.user);
    logger.info('Schedule created', { scheduleId: schedule.id, createdBy: req.user.id });
    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    if (err.code === 'CONFLICT') {
      return res.status(409).json({ success: false, message: err.message, conflicts: err.conflicts || [] });
    }
    logger.error('createSchedule error', { error: err.message });
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await schedulesService.getScheduleById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Schedule not found' });

    const updated = await schedulesService.updateSchedule(id, req.body, req.user);
    logger.info('Schedule updated', { scheduleId: id, updatedBy: req.user.id });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err.code === 'CONFLICT') {
      return res.status(409).json({ success: false, message: err.message, conflicts: err.conflicts || [] });
    }
    logger.error('updateSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await schedulesService.getScheduleById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Schedule not found' });
    await schedulesService.deleteSchedule(id);
    logger.info('Schedule deleted', { scheduleId: id, deletedBy: req.user.id });
    return res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    logger.error('deleteSchedule error', { error: err.message, id: req.params.id });
    next(err);
  }
}

async function assignShifts(req, res, next) {
  try {
    const result = await schedulesService.bulkAssignShifts(req.body.assignments, req.user);
    logger.info('Bulk shift assignment', {
      total: req.body.assignments.length,
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
      data: { created: result.created, conflicts: result.conflicts },
    });
  } catch (err) {
    logger.error('assignShifts error', { error: err.message });
    next(err);
  }
}

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
      startDate = new Date();
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    }

    const weeklyData = await schedulesService.getWeeklySchedule(startDate);
    return res.status(200).json({ success: true, data: weeklyData });
  } catch (err) {
    logger.error('getWeeklySchedule error', { error: err.message });
    next(err);
  }
}

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

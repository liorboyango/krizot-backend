/**
 * Schedule Controller
 * Handles CRUD operations and bulk assignment for shift scheduling.
 */

'use strict';

const scheduleService = require('../services/scheduleService');
const { sendSuccess, sendCreated, sendNoContent, sendPaginated } = require('../utils/response');

/**
 * GET /api/schedules
 * List schedules with pagination and filters.
 */
async function listSchedules(req, res, next) {
  try {
    const {
      page = 1,
      perPage = 20,
      stationId,
      userId,
      startDate,
      endDate,
    } = req.query;
    const result = await scheduleService.listSchedules({
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      stationId,
      userId,
      startDate,
      endDate,
    });
    sendPaginated(res, result.schedules, result.pagination);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/schedules
 * Create a new schedule entry.
 */
async function createSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    sendCreated(res, schedule, 'Schedule created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/schedules/assign
 * Bulk assign users to shifts with conflict detection.
 */
async function assignSchedule(req, res, next) {
  try {
    const result = await scheduleService.assignSchedule(req.body);
    sendCreated(res, result, 'Assignments created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/schedules/:id
 * Get a single schedule entry by ID.
 */
async function getScheduleById(req, res, next) {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    sendSuccess(res, schedule, 'Schedule retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/schedules/:id
 * Update a schedule entry.
 */
async function updateSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.updateSchedule(
      req.params.id,
      req.body
    );
    sendSuccess(res, schedule, 'Schedule updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/schedules/:id
 * Delete a schedule entry.
 */
async function deleteSchedule(req, res, next) {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSchedules,
  createSchedule,
  assignSchedule,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};

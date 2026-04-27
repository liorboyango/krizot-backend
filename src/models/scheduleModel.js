/**
 * Schedule Model Utilities
 *
 * Provides helper functions for common Schedule database operations.
 * Schedules represent shift assignments linking users to stations.
 */

'use strict';

const { prisma } = require('../config/database');

/**
 * Default schedule select fields with related user and station info
 */
const SCHEDULE_SELECT = {
  id: true,
  stationId: true,
  userId: true,
  startTime: true,
  endTime: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  station: {
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      status: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

/**
 * Find a schedule by its unique ID.
 *
 * @param {string} id - Schedule UUID
 * @returns {Promise<Object|null>} Schedule object or null if not found
 */
async function findScheduleById(id) {
  return prisma.schedule.findUnique({
    where: { id },
    select: SCHEDULE_SELECT,
  });
}

/**
 * List schedules with optional filtering and pagination.
 *
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.limit=50] - Items per page
 * @param {string} [options.stationId] - Filter by station ID
 * @param {string} [options.userId] - Filter by user ID
 * @param {Date} [options.startFrom] - Filter schedules starting from this date
 * @param {Date} [options.startTo] - Filter schedules starting before this date
 * @returns {Promise<{schedules: Object[], total: number, page: number, limit: number}>}
 */
async function listSchedules({
  page = 1,
  limit = 50,
  stationId,
  userId,
  startFrom,
  startTo,
} = {}) {
  const where = {};

  if (stationId) where.stationId = stationId;
  if (userId) where.userId = userId;

  if (startFrom || startTo) {
    where.startTime = {};
    if (startFrom) where.startTime.gte = new Date(startFrom);
    if (startTo) where.startTime.lte = new Date(startTo);
  }

  const skip = (page - 1) * limit;

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      select: SCHEDULE_SELECT,
      orderBy: { startTime: 'asc' },
      skip,
      take: limit,
    }),
    prisma.schedule.count({ where }),
  ]);

  return { schedules, total, page, limit };
}

/**
 * Create a new schedule entry.
 *
 * @param {Object} data - Schedule data
 * @param {string} data.stationId - Station UUID
 * @param {string} [data.userId] - User UUID (optional, can be unassigned)
 * @param {Date|string} data.startTime - Shift start time
 * @param {Date|string} data.endTime - Shift end time
 * @param {string} [data.notes] - Optional notes
 * @returns {Promise<Object>} Created schedule
 */
async function createSchedule(data) {
  return prisma.schedule.create({
    data: {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    },
    select: SCHEDULE_SELECT,
  });
}

/**
 * Update an existing schedule.
 *
 * @param {string} id - Schedule UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated schedule
 */
async function updateSchedule(id, data) {
  const updateData = { ...data };
  if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
  if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

  return prisma.schedule.update({
    where: { id },
    data: updateData,
    select: SCHEDULE_SELECT,
  });
}

/**
 * Delete a schedule entry.
 *
 * @param {string} id - Schedule UUID
 * @returns {Promise<Object>} Deleted schedule
 */
async function deleteSchedule(id) {
  return prisma.schedule.delete({
    where: { id },
    select: SCHEDULE_SELECT,
  });
}

/**
 * Check for scheduling conflicts.
 * Detects if a user is already assigned to another shift during the given time range.
 *
 * @param {string} userId - User UUID
 * @param {Date|string} startTime - Proposed shift start
 * @param {Date|string} endTime - Proposed shift end
 * @param {string} [excludeScheduleId] - Schedule ID to exclude (for updates)
 * @returns {Promise<Object[]>} Array of conflicting schedules
 */
async function findUserConflicts(userId, startTime, endTime, excludeScheduleId = null) {
  const where = {
    userId,
    AND: [
      { startTime: { lt: new Date(endTime) } },
      { endTime: { gt: new Date(startTime) } },
    ],
  };

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  return prisma.schedule.findMany({
    where,
    select: SCHEDULE_SELECT,
  });
}

/**
 * Check if a station is over capacity for a given time range.
 * Counts how many users are assigned to the station during the time window.
 *
 * @param {string} stationId - Station UUID
 * @param {Date|string} startTime - Time window start
 * @param {Date|string} endTime - Time window end
 * @param {string} [excludeScheduleId] - Schedule ID to exclude (for updates)
 * @returns {Promise<number>} Number of assigned users in the time window
 */
async function countStationAssignments(stationId, startTime, endTime, excludeScheduleId = null) {
  const where = {
    stationId,
    userId: { not: null }, // Only count assigned shifts
    AND: [
      { startTime: { lt: new Date(endTime) } },
      { endTime: { gt: new Date(startTime) } },
    ],
  };

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  return prisma.schedule.count({ where });
}

/**
 * Bulk create schedules (for bulk assignment).
 *
 * @param {Object[]} schedulesData - Array of schedule data objects
 * @returns {Promise<{count: number}>} Number of created schedules
 */
async function bulkCreateSchedules(schedulesData) {
  const data = schedulesData.map((s) => ({
    ...s,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
  }));

  return prisma.schedule.createMany({
    data,
    skipDuplicates: true,
  });
}

module.exports = {
  SCHEDULE_SELECT,
  findScheduleById,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  findUserConflicts,
  countStationAssignments,
  bulkCreateSchedules,
};

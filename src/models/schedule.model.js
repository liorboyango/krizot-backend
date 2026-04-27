/**
 * Schedule Model Utilities
 * Type-safe operations and helpers for the Schedule entity
 */

const { prisma } = require('../config/database');

/**
 * Schedule status enum
 */
const ScheduleStatus = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  COVERED: 'COVERED',
  CRITICAL: 'CRITICAL',
  CANCELLED: 'CANCELLED',
};

/**
 * Default include for schedule queries (includes station and user info)
 */
const SCHEDULE_DEFAULT_INCLUDE = {
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
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
};

/**
 * Find a schedule by ID
 * @param {string} id - Schedule UUID
 * @returns {Promise<Object|null>}
 */
async function findScheduleById(id) {
  return prisma.schedule.findUnique({
    where: { id },
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Create a new schedule
 * @param {Object} data - Schedule creation data
 * @param {string} data.stationId
 * @param {string|null} [data.userId]
 * @param {Date} data.startTime
 * @param {Date} data.endTime
 * @param {string} [data.status]
 * @param {string} [data.notes]
 * @returns {Promise<Object>} Created schedule with relations
 */
async function createSchedule(data) {
  return prisma.schedule.create({
    data: {
      stationId: data.stationId,
      userId: data.userId || null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      status: data.userId ? ScheduleStatus.ASSIGNED : ScheduleStatus.OPEN,
      notes: data.notes ? data.notes.trim() : null,
    },
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Update a schedule
 * @param {string} id - Schedule UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated schedule with relations
 */
async function updateSchedule(id, data) {
  const updateData = {};

  if (data.stationId !== undefined) updateData.stationId = data.stationId;
  if (data.userId !== undefined) updateData.userId = data.userId;
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;

  return prisma.schedule.update({
    where: { id },
    data: updateData,
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Delete a schedule
 * @param {string} id - Schedule UUID
 * @returns {Promise<Object>} Deleted schedule
 */
async function deleteSchedule(id) {
  return prisma.schedule.delete({
    where: { id },
  });
}

/**
 * List schedules with pagination and filtering
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.stationId] - Filter by station
 * @param {string} [options.userId] - Filter by assigned user
 * @param {string} [options.status] - Filter by status
 * @param {Date} [options.startDate] - Filter schedules starting after this date
 * @param {Date} [options.endDate] - Filter schedules ending before this date
 * @returns {Promise<{schedules: Array, total: number, page: number, totalPages: number}>}
 */
async function listSchedules({
  page = 1,
  limit = 20,
  stationId,
  userId,
  status,
  startDate,
  endDate,
} = {}) {
  const skip = (page - 1) * limit;

  const where = {};
  if (stationId) where.stationId = stationId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate);
    if (endDate) where.startTime.lte = new Date(endDate);
  }

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      include: SCHEDULE_DEFAULT_INCLUDE,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' },
    }),
    prisma.schedule.count({ where }),
  ]);

  return {
    schedules,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get schedules for a date range (for weekly view)
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} [stationId] - Optional station filter
 * @returns {Promise<Array>}
 */
async function getSchedulesForDateRange(startDate, endDate, stationId = null) {
  const where = {
    OR: [
      {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      {
        endTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    ],
  };

  if (stationId) where.stationId = stationId;

  return prisma.schedule.findMany({
    where,
    include: SCHEDULE_DEFAULT_INCLUDE,
    orderBy: [{ startTime: 'asc' }, { station: { name: 'asc' } }],
  });
}

/**
 * Assign a user to a schedule
 * @param {string} scheduleId
 * @param {string} userId
 * @returns {Promise<Object>} Updated schedule
 */
async function assignUserToSchedule(scheduleId, userId) {
  return prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      userId,
      status: ScheduleStatus.ASSIGNED,
    },
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Unassign a user from a schedule
 * @param {string} scheduleId
 * @returns {Promise<Object>} Updated schedule
 */
async function unassignUserFromSchedule(scheduleId) {
  return prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      userId: null,
      status: ScheduleStatus.OPEN,
    },
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Check for scheduling conflicts for a user
 * Returns overlapping schedules for the given user and time range
 * @param {string} userId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string} [excludeScheduleId] - Exclude a specific schedule (for updates)
 * @returns {Promise<Array>} Conflicting schedules
 */
async function checkUserConflicts(userId, startTime, endTime, excludeScheduleId = null) {
  const where = {
    userId,
    status: { notIn: [ScheduleStatus.CANCELLED] },
    OR: [
      {
        // New shift starts during existing shift
        startTime: { lte: new Date(startTime) },
        endTime: { gt: new Date(startTime) },
      },
      {
        // New shift ends during existing shift
        startTime: { lt: new Date(endTime) },
        endTime: { gte: new Date(endTime) },
      },
      {
        // New shift completely contains existing shift
        startTime: { gte: new Date(startTime) },
        endTime: { lte: new Date(endTime) },
      },
    ],
  };

  if (excludeScheduleId) where.id = { not: excludeScheduleId };

  return prisma.schedule.findMany({
    where,
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Check for station capacity conflicts
 * Returns schedules that overlap with the given time range for a station
 * @param {string} stationId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string} [excludeScheduleId]
 * @returns {Promise<Array>}
 */
async function checkStationConflicts(stationId, startTime, endTime, excludeScheduleId = null) {
  const where = {
    stationId,
    status: { notIn: [ScheduleStatus.CANCELLED] },
    OR: [
      {
        startTime: { lte: new Date(startTime) },
        endTime: { gt: new Date(startTime) },
      },
      {
        startTime: { lt: new Date(endTime) },
        endTime: { gte: new Date(endTime) },
      },
      {
        startTime: { gte: new Date(startTime) },
        endTime: { lte: new Date(endTime) },
      },
    ],
  };

  if (excludeScheduleId) where.id = { not: excludeScheduleId };

  return prisma.schedule.findMany({
    where,
    include: SCHEDULE_DEFAULT_INCLUDE,
  });
}

/**
 * Bulk assign schedules (for the /schedules/assign endpoint)
 * @param {Array<{scheduleId: string, userId: string}>} assignments
 * @returns {Promise<Array>} Updated schedules
 */
async function bulkAssignSchedules(assignments) {
  const results = await prisma.$transaction(
    assignments.map(({ scheduleId, userId }) =>
      prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          userId,
          status: ScheduleStatus.ASSIGNED,
        },
        include: SCHEDULE_DEFAULT_INCLUDE,
      })
    )
  );
  return results;
}

/**
 * Get schedule statistics for dashboard
 * @param {Date} [date] - Date to get stats for (defaults to today)
 * @returns {Promise<Object>}
 */
async function getScheduleStats(date = new Date()) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const where = {
    startTime: { gte: dayStart, lt: dayEnd },
  };

  const [total, open, assigned, covered, critical] = await Promise.all([
    prisma.schedule.count({ where }),
    prisma.schedule.count({ where: { ...where, status: ScheduleStatus.OPEN } }),
    prisma.schedule.count({ where: { ...where, status: ScheduleStatus.ASSIGNED } }),
    prisma.schedule.count({ where: { ...where, status: ScheduleStatus.COVERED } }),
    prisma.schedule.count({ where: { ...where, status: ScheduleStatus.CRITICAL } }),
  ]);

  return { total, open, assigned, covered, critical };
}

module.exports = {
  ScheduleStatus,
  SCHEDULE_DEFAULT_INCLUDE,
  findScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listSchedules,
  getSchedulesForDateRange,
  assignUserToSchedule,
  unassignUserFromSchedule,
  checkUserConflicts,
  checkStationConflicts,
  bulkAssignSchedules,
  getScheduleStats,
};

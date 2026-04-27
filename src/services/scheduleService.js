/**
 * Schedule Service
 * Business logic for shift scheduling and assignments.
 * Handles conflict detection, bulk operations, and schedule queries.
 */

const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * List schedules with optional filters and pagination.
 * @param {Object} filters - { stationId, userId, startDate, endDate }
 * @param {number} skip - Pagination offset
 * @param {number} take - Page size
 * @returns {{ schedules: Array, total: number }}
 */
async function listSchedules(filters = {}, skip = 0, take = 50) {
  const where = buildWhereClause(filters);

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      skip,
      take,
      orderBy: { startTime: 'asc' },
      include: {
        station: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    }),
    prisma.schedule.count({ where }),
  ]);

  return { schedules, total };
}

/**
 * Get a single schedule by ID.
 * @param {string} id
 * @returns {Object|null}
 */
async function getScheduleById(id) {
  return prisma.schedule.findUnique({
    where: { id },
    include: {
      station: { select: { id: true, name: true, location: true, capacity: true } },
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
}

/**
 * Create a new schedule (shift).
 * Validates that endTime > startTime and checks for station/user conflicts.
 * @param {Object} data - { stationId, userId, startTime, endTime, notes }
 * @returns {Object} Created schedule
 */
async function createSchedule(data) {
  const { stationId, userId, startTime, endTime, notes } = data;

  // Validate time range
  if (endTime <= startTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  // Validate station exists
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) {
    throw new AppError(`Station ${stationId} not found`, 404);
  }

  // Check station capacity: count overlapping schedules for this station
  const stationConflicts = await countStationOverlaps(stationId, startTime, endTime, null);
  if (stationConflicts >= station.capacity) {
    throw new AppError(
      `Station ${station.name} is at full capacity (${station.capacity}) for this time slot`,
      409
    );
  }

  // If userId provided, validate user exists and check for double-booking
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(`User ${userId} not found`, 404);
    }

    const userConflict = await checkUserConflict(userId, startTime, endTime, null);
    if (userConflict) {
      throw new AppError(
        `User is already assigned to another shift during this time period`,
        409
      );
    }
  }

  return prisma.schedule.create({
    data: { stationId, userId, startTime, endTime, notes },
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
}

/**
 * Update an existing schedule.
 * Re-validates conflicts if time or assignment changes.
 * @param {string} id
 * @param {Object} data - Partial update fields
 * @returns {Object} Updated schedule
 */
async function updateSchedule(id, data) {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Schedule not found', 404);
  }

  const newStartTime = data.startTime || existing.startTime;
  const newEndTime = data.endTime || existing.endTime;
  const newStationId = data.stationId || existing.stationId;
  const newUserId = data.hasOwnProperty('userId') ? data.userId : existing.userId;

  // Validate time range
  if (newEndTime <= newStartTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  // If station changed or time changed, re-check station capacity
  if (data.stationId || data.startTime || data.endTime) {
    const station = await prisma.station.findUnique({ where: { id: newStationId } });
    if (!station) {
      throw new AppError(`Station ${newStationId} not found`, 404);
    }

    const stationConflicts = await countStationOverlaps(newStationId, newStartTime, newEndTime, id);
    if (stationConflicts >= station.capacity) {
      throw new AppError(
        `Station ${station.name} is at full capacity for this time slot`,
        409
      );
    }
  }

  // If user changed or time changed, re-check user conflicts
  if (newUserId && (data.userId || data.startTime || data.endTime)) {
    const userConflict = await checkUserConflict(newUserId, newStartTime, newEndTime, id);
    if (userConflict) {
      throw new AppError(
        `User is already assigned to another shift during this time period`,
        409
      );
    }
  }

  return prisma.schedule.update({
    where: { id },
    data,
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
}

/**
 * Delete a schedule by ID.
 * @param {string} id
 */
async function deleteSchedule(id) {
  await prisma.schedule.delete({ where: { id } });
}

/**
 * Bulk assign users to shifts.
 * Each assignment can be:
 *   - { scheduleId, userId } - assign user to existing schedule
 *   - { stationId, userId, startTime, endTime, notes? } - create new schedule with assignment
 *
 * Returns results for each assignment (succeeded/failed).
 * @param {Array} assignments
 * @returns {{ succeeded: Array, failed: Array }}
 */
async function bulkAssign(assignments) {
  const succeeded = [];
  const failed = [];

  for (const assignment of assignments) {
    try {
      let result;

      if (assignment.scheduleId) {
        // Assign user to existing schedule
        const existing = await prisma.schedule.findUnique({
          where: { id: assignment.scheduleId },
        });

        if (!existing) {
          throw new AppError(`Schedule ${assignment.scheduleId} not found`, 404);
        }

        if (assignment.userId) {
          // Check user conflict (exclude current schedule)
          const conflict = await checkUserConflict(
            assignment.userId,
            existing.startTime,
            existing.endTime,
            existing.id
          );

          if (conflict) {
            throw new AppError(
              `User ${assignment.userId} has a conflicting shift during this time`,
              409
            );
          }
        }

        result = await prisma.schedule.update({
          where: { id: assignment.scheduleId },
          data: { userId: assignment.userId || null },
          include: {
            station: { select: { id: true, name: true } },
            user: { select: { id: true, email: true, name: true } },
          },
        });
      } else {
        // Create new schedule with assignment
        result = await createSchedule({
          stationId: assignment.stationId,
          userId: assignment.userId || null,
          startTime: new Date(assignment.startTime),
          endTime: new Date(assignment.endTime),
          notes: assignment.notes || null,
        });
      }

      succeeded.push({ assignment, schedule: result });
    } catch (err) {
      logger.warn(`Bulk assignment failed for item: ${JSON.stringify(assignment)} - ${err.message}`);
      failed.push({
        assignment,
        error: err.message,
        statusCode: err.statusCode || 500,
      });
    }
  }

  return { succeeded, failed };
}

/**
 * Get dashboard statistics for a given date.
 * Returns counts for stations, on-duty staff, open shifts, and critical shifts.
 * @param {Date} date
 * @returns {Object} Stats object
 */
async function getDashboardStats(date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [totalStations, activeStations, todaySchedules] = await Promise.all([
    prisma.station.count(),
    prisma.station.count({ where: { status: 'ACTIVE' } }),
    prisma.schedule.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      include: {
        station: { select: { id: true, name: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    }),
  ]);

  const onDuty = todaySchedules.filter((s) => s.userId !== null).length;
  const openShifts = todaySchedules.filter((s) => s.userId === null).length;

  // Critical: open shifts at active stations
  const criticalShifts = todaySchedules.filter(
    (s) => s.userId === null && s.station.status === 'ACTIVE'
  ).length;

  return {
    totalStations,
    activeStations,
    onDuty,
    openShifts,
    criticalShifts,
    date: date.toISOString().split('T')[0],
    todaySchedules,
  };
}

/**
 * Get weekly schedule grid (stations x days).
 * Returns a matrix of station schedules for a 7-day period.
 * @param {Date} weekStart - Monday of the target week
 * @returns {Object} Weekly schedule data
 */
async function getWeeklySchedule(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const [stations, schedules] = await Promise.all([
    prisma.station.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    }),
    prisma.schedule.findMany({
      where: {
        startTime: { lte: weekEnd },
        endTime: { gte: weekStart },
      },
      include: {
        station: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  // Build grid: { stationId: { dayIndex: [schedules] } }
  const grid = {};
  for (const station of stations) {
    grid[station.id] = { station, days: {} };
    for (let d = 0; d < 7; d++) {
      grid[station.id].days[d] = [];
    }
  }

  for (const schedule of schedules) {
    const stationId = schedule.stationId;
    if (!grid[stationId]) continue;

    // Determine which day(s) this schedule falls on within the week
    const schedStart = new Date(schedule.startTime);
    const dayIndex = Math.floor(
      (schedStart - weekStart) / (1000 * 60 * 60 * 24)
    );

    if (dayIndex >= 0 && dayIndex < 7) {
      grid[stationId].days[dayIndex].push(schedule);
    }
  }

  // Build days array for response
  const days = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    days.push({
      index: d,
      date: day.toISOString().split('T')[0],
      dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    days,
    grid: Object.values(grid),
  };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Build Prisma where clause from filter object.
 */
function buildWhereClause(filters) {
  const where = {};

  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.userId) where.userId = filters.userId;

  if (filters.startDate || filters.endDate) {
    where.startTime = {};
    if (filters.startDate) where.startTime.gte = filters.startDate;
    if (filters.endDate) where.startTime.lte = filters.endDate;
  }

  return where;
}

/**
 * Count overlapping schedules for a station (excluding a specific schedule ID).
 * Used to enforce station capacity limits.
 */
async function countStationOverlaps(stationId, startTime, endTime, excludeId) {
  const where = {
    stationId,
    AND: [
      { startTime: { lt: endTime } },
      { endTime: { gt: startTime } },
    ],
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  return prisma.schedule.count({ where });
}

/**
 * Check if a user has any overlapping schedule (double-booking).
 * Returns the conflicting schedule or null.
 */
async function checkUserConflict(userId, startTime, endTime, excludeId) {
  const where = {
    userId,
    AND: [
      { startTime: { lt: endTime } },
      { endTime: { gt: startTime } },
    ],
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  return prisma.schedule.findFirst({ where });
}

module.exports = {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bulkAssign,
  getDashboardStats,
  getWeeklySchedule,
};

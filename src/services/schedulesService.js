/**
 * Schedules Service
 * Business logic for shift scheduling and assignments.
 * Handles conflict detection, bulk operations, and schedule queries.
 */

const prisma = require('../config/prismaClient');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * List schedules with optional filters and pagination.
 * @param {Object} filters - { stationId, userId, startDate, endDate }
 * @param {number} page
 * @param {number} limit
 * @returns {{ schedules: Array, total: number }}
 */
async function listSchedules(filters, page, limit) {
  const safeFilters = filters || {};
  const safePage = page || 1;
  const safeLimit = limit || 20;

  const where = {};

  if (safeFilters.stationId) where.stationId = safeFilters.stationId;
  if (safeFilters.userId) where.userId = safeFilters.userId;

  if (safeFilters.startDate || safeFilters.endDate) {
    where.startTime = {};
    if (safeFilters.startDate) where.startTime.gte = safeFilters.startDate;
    if (safeFilters.endDate) where.startTime.lte = safeFilters.endDate;
  }

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      include: {
        station: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
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
 * Check for scheduling conflicts for a user or station.
 * A conflict exists when:
 *  - The same user has an overlapping shift, OR
 *  - The station is at full capacity for the overlapping time window.
 *
 * @param {string} stationId
 * @param {string|null} userId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string|null} excludeScheduleId - ID to exclude (for updates)
 * @returns {Array} Array of conflict descriptor objects
 */
async function detectConflicts(stationId, userId, startTime, endTime, excludeScheduleId) {
  const conflicts = [];
  const excludeId = excludeScheduleId || null;

  // Check user double-booking
  if (userId) {
    const userConflictWhere = {
      userId,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };
    if (excludeId) {
      userConflictWhere.NOT = { id: excludeId };
    }

    const userConflicts = await prisma.schedule.findMany({
      where: userConflictWhere,
      include: {
        station: { select: { id: true, name: true } },
      },
    });

    if (userConflicts.length > 0) {
      userConflicts.forEach((c) => {
        conflicts.push({
          type: 'USER_DOUBLE_BOOKING',
          message: `User is already assigned to station "${c.station.name}" during this time`,
          conflictingScheduleId: c.id,
          startTime: c.startTime,
          endTime: c.endTime,
        });
      });
    }
  }

  // Check station capacity
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { capacity: true, name: true },
  });

  if (station) {
    const stationCountWhere = {
      stationId,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };
    if (excludeId) {
      stationCountWhere.NOT = { id: excludeId };
    }

    const stationScheduleCount = await prisma.schedule.count({
      where: stationCountWhere,
    });

    if (stationScheduleCount >= station.capacity) {
      conflicts.push({
        type: 'STATION_CAPACITY_EXCEEDED',
        message: `Station "${station.name}" is at full capacity (${station.capacity}) for this time slot`,
        stationId,
        capacity: station.capacity,
        currentAssignments: stationScheduleCount,
      });
    }
  }

  return conflicts;
}

/**
 * Create a new schedule entry.
 * @param {Object} data - { stationId, userId?, startTime, endTime, notes? }
 * @param {Object} requestingUser - The authenticated user
 * @returns {Object} Created schedule
 */
async function createSchedule(data, requestingUser) {
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  // Verify station exists
  const station = await prisma.station.findUnique({ where: { id: data.stationId } });
  if (!station) {
    throw new AppError('Station not found', 404);
  }

  // Verify user exists if provided
  if (data.userId) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
  }

  const conflicts = await detectConflicts(
    data.stationId,
    data.userId || null,
    startTime,
    endTime,
    null
  );

  if (conflicts.length > 0) {
    const err = new AppError('Scheduling conflict detected', 409);
    err.code = 'CONFLICT';
    err.conflicts = conflicts;
    throw err;
  }

  const schedule = await prisma.schedule.create({
    data: {
      stationId: data.stationId,
      userId: data.userId || null,
      startTime,
      endTime,
      notes: data.notes || null,
    },
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return schedule;
}

/**
 * Update an existing schedule.
 * @param {string} id
 * @param {Object} data - Partial schedule fields
 * @param {Object} requestingUser
 * @returns {Object} Updated schedule
 */
async function updateSchedule(id, data, requestingUser) {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Schedule not found', 404);
  }

  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
  const stationId = data.stationId || existing.stationId;
  const userId = data.userId !== undefined ? data.userId : existing.userId;

  if (endTime <= startTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  const conflicts = await detectConflicts(stationId, userId, startTime, endTime, id);

  if (conflicts.length > 0) {
    const err = new AppError('Scheduling conflict detected', 409);
    err.code = 'CONFLICT';
    err.conflicts = conflicts;
    throw err;
  }

  const updateData = {};
  if (data.stationId) updateData.stationId = data.stationId;
  if (data.userId !== undefined) updateData.userId = data.userId;
  if (data.startTime) updateData.startTime = startTime;
  if (data.endTime) updateData.endTime = endTime;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await prisma.schedule.update({
    where: { id },
    data: updateData,
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return updated;
}

/**
 * Delete a schedule entry.
 * @param {string} id
 */
async function deleteSchedule(id) {
  await prisma.schedule.delete({ where: { id } });
}

/**
 * Bulk assign shifts with conflict detection.
 * Processes each assignment independently; collects conflicts without aborting.
 * @param {Array} assignments - Array of { stationId, userId, startTime, endTime, notes? }
 * @param {Object} requestingUser
 * @returns {{ created: Array, conflicts: Array }}
 */
async function bulkAssignShifts(assignments, requestingUser) {
  const created = [];
  const conflicts = [];

  for (const assignment of assignments) {
    try {
      const schedule = await createSchedule(assignment, requestingUser);
      created.push(schedule);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        conflicts.push({
          assignment,
          conflicts: err.conflicts,
          message: err.message,
        });
      } else {
        // Re-throw unexpected errors
        throw err;
      }
    }
  }

  return { created, conflicts };
}

/**
 * Get weekly schedule grid data.
 * Returns a 7-day view starting from the given Monday.
 * @param {Date} weekStart - Monday of the target week
 * @returns {Object} Weekly grid: { weekStart, weekEnd, days, grid }
 */
async function getWeeklySchedule(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const [schedules, stations] = await Promise.all([
    prisma.schedule.findMany({
      where: {
        startTime: { gte: weekStart },
        endTime: { lte: weekEnd },
      },
      include: {
        station: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.station.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, location: true, capacity: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Build 7-day array
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    days.push({
      date: dayStr,
      dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
      schedules: schedules.filter((s) => {
        const scheduleDate = new Date(s.startTime).toISOString().split('T')[0];
        return scheduleDate === dayStr;
      }),
    });
  }

  // Build station-centric grid
  const grid = stations.map((station) => ({
    station,
    days: days.map((day) => ({
      date: day.date,
      dayName: day.dayName,
      schedules: day.schedules.filter((s) => s.stationId === station.id),
    })),
  }));

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    days: days.map((d) => ({ date: d.date, dayName: d.dayName })),
    grid,
  };
}

/**
 * Get scheduling statistics for the dashboard.
 * @returns {Object} Stats: { totalStations, onDutyNow, openShiftsToday, criticalShifts }
 */
async function getScheduleStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [totalStations, onDutyNow, todaySchedules, activeStations] = await Promise.all([
    prisma.station.count({ where: { status: 'ACTIVE' } }),
    prisma.schedule.count({
      where: {
        startTime: { lte: now },
        endTime: { gte: now },
        userId: { not: null },
      },
    }),
    prisma.schedule.findMany({
      where: {
        startTime: { gte: todayStart, lte: todayEnd },
      },
      select: { userId: true, stationId: true },
    }),
    prisma.station.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    }),
  ]);

  const assignedStationIds = new Set(
    todaySchedules.filter((s) => s.userId).map((s) => s.stationId)
  );
  const openShiftsToday = activeStations.filter((s) => !assignedStationIds.has(s.id)).length;

  // Critical: stations with no coverage in the next 2 hours
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const upcomingCoveredStations = await prisma.schedule.findMany({
    where: {
      startTime: { lte: twoHoursLater },
      endTime: { gte: now },
      userId: { not: null },
    },
    select: { stationId: true },
  });
  const coveredIds = new Set(upcomingCoveredStations.map((s) => s.stationId));
  const criticalShifts = activeStations.filter((s) => !coveredIds.has(s.id)).length;

  return {
    totalStations,
    onDutyNow,
    openShiftsToday,
    criticalShifts,
  };
}

module.exports = {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bulkAssignShifts,
  getWeeklySchedule,
  getScheduleStats,
  detectConflicts,
};

/**
 * Schedule Service
 * Business logic for shift scheduling, assignments, and conflict detection.
 */

'use strict';

const { getPrismaClient } = require('../config/database');
const { NotFoundError, ConflictError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * List schedules with pagination and filters.
 * @param {object} options - Query options
 * @returns {object} { schedules, pagination }
 */
async function listSchedules({
  page = 1,
  perPage = 20,
  stationId,
  userId,
  startDate,
  endDate,
} = {}) {
  const prisma = getPrismaClient();
  const skip = (page - 1) * perPage;

  const where = {
    ...(stationId && { stationId }),
    ...(userId && { userId }),
    ...(startDate || endDate
      ? {
          startTime: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {}),
  };

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      skip,
      take: perPage,
      include: {
        station: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.schedule.count({ where }),
  ]);

  return {
    schedules,
    pagination: { total, page, perPage },
  };
}

/**
 * Create a new schedule entry.
 * @param {object} data - Schedule data { stationId, userId, startTime, endTime }
 * @returns {object} Created schedule
 * @throws {ConflictError} If scheduling conflict detected
 */
async function createSchedule(data) {
  const prisma = getPrismaClient();

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    throw new AppError('End time must be after start time', 400, 'INVALID_TIME_RANGE');
  }

  // Check for user scheduling conflicts
  await checkUserConflict(prisma, data.userId, startTime, endTime);

  // Check station capacity
  await checkStationCapacity(prisma, data.stationId, startTime, endTime);

  const schedule = await prisma.schedule.create({
    data: {
      stationId: data.stationId,
      userId: data.userId,
      startTime,
      endTime,
    },
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return schedule;
}

/**
 * Bulk assign users to shifts with conflict validation.
 * @param {object} data - Assignment data { assignments: [{ stationId, userId, startTime, endTime }] }
 * @returns {object} { created, conflicts }
 */
async function assignSchedule(data) {
  const prisma = getPrismaClient();
  const { assignments } = data;

  const created = [];
  const conflicts = [];

  for (const assignment of assignments) {
    try {
      const startTime = new Date(assignment.startTime);
      const endTime = new Date(assignment.endTime);

      if (endTime <= startTime) {
        conflicts.push({
          assignment,
          reason: 'End time must be after start time',
        });
        continue;
      }

      await checkUserConflict(prisma, assignment.userId, startTime, endTime);
      await checkStationCapacity(prisma, assignment.stationId, startTime, endTime);

      const schedule = await prisma.schedule.create({
        data: {
          stationId: assignment.stationId,
          userId: assignment.userId,
          startTime,
          endTime,
        },
        include: {
          station: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });

      created.push(schedule);
    } catch (error) {
      if (error instanceof ConflictError || error instanceof AppError) {
        conflicts.push({ assignment, reason: error.message });
      } else {
        throw error;
      }
    }
  }

  logger.info(`Bulk assign: ${created.length} created, ${conflicts.length} conflicts`);

  return { created, conflicts };
}

/**
 * Get a schedule entry by ID.
 * @param {string} id - Schedule ID
 * @returns {object} Schedule data
 * @throws {NotFoundError} If schedule not found
 */
async function getScheduleById(id) {
  const prisma = getPrismaClient();

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!schedule) {
    throw new NotFoundError('Schedule');
  }

  return schedule;
}

/**
 * Update a schedule entry.
 * @param {string} id - Schedule ID
 * @param {object} data - Fields to update
 * @returns {object} Updated schedule
 */
async function updateSchedule(id, data) {
  const prisma = getPrismaClient();

  const existing = await getScheduleById(id);

  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;

  if (endTime <= startTime) {
    throw new AppError('End time must be after start time', 400, 'INVALID_TIME_RANGE');
  }

  const userId = data.userId || existing.userId;
  const stationId = data.stationId || existing.stationId;

  // Check conflicts (excluding current schedule)
  if (data.userId || data.startTime || data.endTime) {
    await checkUserConflict(prisma, userId, startTime, endTime, id);
  }

  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      ...(data.stationId && { stationId }),
      ...(data.userId && { userId }),
      startTime,
      endTime,
    },
    include: {
      station: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return schedule;
}

/**
 * Delete a schedule entry.
 * @param {string} id - Schedule ID
 */
async function deleteSchedule(id) {
  const prisma = getPrismaClient();

  await getScheduleById(id);

  await prisma.schedule.delete({ where: { id } });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Check if a user has a conflicting schedule in the given time range.
 * @param {object} prisma - Prisma client
 * @param {string} userId - User ID
 * @param {Date} startTime - Shift start
 * @param {Date} endTime - Shift end
 * @param {string} [excludeId] - Schedule ID to exclude (for updates)
 * @throws {ConflictError} If conflict found
 */
async function checkUserConflict(prisma, userId, startTime, endTime, excludeId) {
  const conflict = await prisma.schedule.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
  });

  if (conflict) {
    throw new ConflictError(
      `User already has a shift from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}`
    );
  }
}

/**
 * Check if a station has capacity for a new assignment in the given time range.
 * @param {object} prisma - Prisma client
 * @param {string} stationId - Station ID
 * @param {Date} startTime - Shift start
 * @param {Date} endTime - Shift end
 * @throws {ConflictError} If station is at capacity
 */
async function checkStationCapacity(prisma, stationId, startTime, endTime) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { capacity: true, name: true },
  });

  if (!station) {
    throw new NotFoundError('Station');
  }

  const overlappingCount = await prisma.schedule.count({
    where: {
      stationId,
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
  });

  if (overlappingCount >= station.capacity) {
    throw new ConflictError(
      `Station '${station.name}' is at full capacity (${station.capacity}) for this time slot`
    );
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

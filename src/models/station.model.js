/**
 * Station Model Utilities
 * Type-safe operations and helpers for the Station entity
 */

const { prisma } = require('../config/database');

/**
 * Station status enum
 */
const StationStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  MAINTENANCE: 'MAINTENANCE',
};

/**
 * Find a station by ID
 * @param {string} id - Station UUID
 * @param {boolean} includeSchedules - Whether to include related schedules
 * @returns {Promise<Object|null>}
 */
async function findStationById(id, includeSchedules = false) {
  return prisma.station.findUnique({
    where: { id },
    include: includeSchedules
      ? {
          schedules: {
            where: {
              startTime: { gte: new Date() },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { startTime: 'asc' },
            take: 10,
          },
        }
      : undefined,
  });
}

/**
 * Create a new station
 * @param {Object} data - Station creation data
 * @param {string} data.name
 * @param {string} data.location
 * @param {number} data.capacity
 * @param {string} [data.status]
 * @param {string} [data.notes]
 * @returns {Promise<Object>} Created station
 */
async function createStation(data) {
  return prisma.station.create({
    data: {
      name: data.name.trim(),
      location: data.location.trim(),
      capacity: data.capacity,
      status: data.status || StationStatus.ACTIVE,
      notes: data.notes ? data.notes.trim() : null,
    },
  });
}

/**
 * Update a station
 * @param {string} id - Station UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated station
 */
async function updateStation(id, data) {
  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.location !== undefined) updateData.location = data.location.trim();
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;

  return prisma.station.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a station (hard delete - cascades to schedules)
 * @param {string} id - Station UUID
 * @returns {Promise<Object>} Deleted station
 */
async function deleteStation(id) {
  return prisma.station.delete({
    where: { id },
  });
}

/**
 * List stations with pagination and filtering
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.search] - Search by name or location
 * @param {boolean} [options.includeScheduleCount] - Include count of upcoming schedules
 * @returns {Promise<{stations: Array, total: number, page: number, totalPages: number}>}
 */
async function listStations({
  page = 1,
  limit = 20,
  status,
  search,
  includeScheduleCount = false,
} = {}) {
  const skip = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [stations, total] = await Promise.all([
    prisma.station.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: includeScheduleCount
        ? {
            _count: {
              select: { schedules: true },
            },
          }
        : undefined,
    }),
    prisma.station.count({ where }),
  ]);

  return {
    stations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get station statistics
 * @returns {Promise<Object>} Station counts by status
 */
async function getStationStats() {
  const [total, active, closed, maintenance] = await Promise.all([
    prisma.station.count(),
    prisma.station.count({ where: { status: StationStatus.ACTIVE } }),
    prisma.station.count({ where: { status: StationStatus.CLOSED } }),
    prisma.station.count({ where: { status: StationStatus.MAINTENANCE } }),
  ]);

  return { total, active, closed, maintenance };
}

/**
 * Check if a station name is already taken (excluding a specific station)
 * @param {string} name
 * @param {string} [excludeId] - Station ID to exclude
 * @returns {Promise<boolean>}
 */
async function isStationNameTaken(name, excludeId = null) {
  const where = { name: { equals: name.trim(), mode: 'insensitive' } };
  if (excludeId) where.id = { not: excludeId };

  const count = await prisma.station.count({ where });
  return count > 0;
}

module.exports = {
  StationStatus,
  findStationById,
  createStation,
  updateStation,
  deleteStation,
  listStations,
  getStationStats,
  isStationNameTaken,
};

/**
 * Stations Service
 * Business logic layer for station management.
 * All database interactions go through Prisma ORM.
 */

const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');

/**
 * List stations with pagination, search, and filtering.
 *
 * @param {object} options
 * @param {number} options.page        - Page number (1-based)
 * @param {number} options.limit       - Items per page
 * @param {string} options.search      - Search term for name/location
 * @param {string} [options.status]    - Filter by status ('ACTIVE' | 'CLOSED')
 * @param {string} options.sortBy      - Field to sort by
 * @param {string} options.sortOrder   - 'asc' | 'desc'
 * @returns {{ stations: Station[], total: number }}
 */
async function listStations({ page, limit, search, status, sortBy, sortOrder }) {
  const allowedSortFields = ['name', 'location', 'capacity', 'status', 'createdAt', 'updatedAt'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    const normalizedStatus = status.toUpperCase();
    if (['ACTIVE', 'CLOSED'].includes(normalizedStatus)) {
      where.status = normalizedStatus;
    }
  }

  const [stations, total] = await Promise.all([
    prisma.station.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { schedules: true },
        },
      },
    }),
    prisma.station.count({ where }),
  ]);

  return { stations, total };
}

/**
 * Get a single station by its ID.
 *
 * @param {string} id - Station UUID
 * @returns {Station|null}
 */
async function getStationById(id) {
  const station = await prisma.station.findUnique({
    where: { id },
    include: {
      schedules: {
        orderBy: { startTime: 'asc' },
        take: 10,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
      _count: {
        select: { schedules: true },
      },
    },
  });

  return station;
}

/**
 * Create a new station.
 *
 * @param {object} data
 * @param {string} data.name       - Station name (must be unique)
 * @param {string} data.location   - Location / sector
 * @param {number} data.capacity   - Staff slot capacity
 * @param {string} [data.status]   - 'ACTIVE' | 'CLOSED' (default: 'ACTIVE')
 * @param {string} [data.notes]    - Optional notes
 * @returns {Station}
 */
async function createStation({ name, location, capacity, status = 'ACTIVE', notes }) {
  // Enforce unique station name
  const existing = await prisma.station.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new AppError(`A station with the name "${name}" already exists`, 409);
  }

  const station = await prisma.station.create({
    data: {
      name,
      location,
      capacity,
      status: status.toUpperCase(),
      notes: notes || null,
    },
  });

  return station;
}

/**
 * Update an existing station.
 *
 * @param {string} id   - Station UUID
 * @param {object} data - Fields to update (all optional)
 * @returns {Station}
 */
async function updateStation(id, { name, location, capacity, status, notes }) {
  // If renaming, check uniqueness against other stations
  if (name) {
    const duplicate = await prisma.station.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new AppError(`A station with the name "${name}" already exists`, 409);
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (location !== undefined) updateData.location = location;
  if (capacity !== undefined) updateData.capacity = capacity;
  if (status !== undefined) updateData.status = status.toUpperCase();
  if (notes !== undefined) updateData.notes = notes;

  const station = await prisma.station.update({
    where: { id },
    data: updateData,
  });

  return station;
}

/**
 * Delete a station.
 * Throws if the station has future schedules to prevent orphaned data.
 *
 * @param {string} id - Station UUID
 */
async function deleteStation(id) {
  // Check for future schedules linked to this station
  const futureSchedules = await prisma.schedule.count({
    where: {
      stationId: id,
      startTime: { gte: new Date() },
    },
  });

  if (futureSchedules > 0) {
    throw new AppError(
      `Cannot delete station: it has ${futureSchedules} upcoming schedule(s). ` +
        'Please reassign or cancel them first.',
      409
    );
  }

  await prisma.station.delete({ where: { id } });
}

module.exports = {
  listStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
};

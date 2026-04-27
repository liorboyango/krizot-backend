/**
 * Station Service
 * Business logic for station CRUD operations.
 */

'use strict';

const { getPrismaClient } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * List stations with pagination and optional filters.
 * @param {object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.perPage - Items per page
 * @param {string} [options.search] - Search by name or location
 * @param {string} [options.status] - Filter by status ('active' | 'closed')
 * @returns {object} { stations, pagination }
 */
async function listStations({ page = 1, perPage = 20, search, status } = {}) {
  const prisma = getPrismaClient();
  const skip = (page - 1) * perPage;

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [stations, total] = await Promise.all([
    prisma.station.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.station.count({ where }),
  ]);

  return {
    stations,
    pagination: { total, page, perPage },
  };
}

/**
 * Create a new station.
 * @param {object} data - Station data { name, location, capacity, status, notes }
 * @returns {object} Created station
 */
async function createStation(data) {
  const prisma = getPrismaClient();

  const station = await prisma.station.create({
    data: {
      name: data.name,
      location: data.location,
      capacity: data.capacity,
      status: data.status || 'active',
      notes: data.notes || null,
    },
  });

  return station;
}

/**
 * Get a station by ID.
 * @param {string} id - Station ID
 * @returns {object} Station data
 * @throws {NotFoundError} If station not found
 */
async function getStationById(id) {
  const prisma = getPrismaClient();

  const station = await prisma.station.findUnique({
    where: { id },
    include: {
      schedules: {
        where: {
          startTime: { gte: new Date() },
        },
        take: 10,
        orderBy: { startTime: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!station) {
    throw new NotFoundError('Station');
  }

  return station;
}

/**
 * Update a station.
 * @param {string} id - Station ID
 * @param {object} data - Fields to update
 * @returns {object} Updated station
 * @throws {NotFoundError} If station not found
 */
async function updateStation(id, data) {
  const prisma = getPrismaClient();

  // Verify station exists
  await getStationById(id);

  const station = await prisma.station.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return station;
}

/**
 * Delete a station.
 * @param {string} id - Station ID
 * @throws {NotFoundError} If station not found
 */
async function deleteStation(id) {
  const prisma = getPrismaClient();

  // Verify station exists
  await getStationById(id);

  await prisma.station.delete({ where: { id } });
}

module.exports = {
  listStations,
  createStation,
  getStationById,
  updateStation,
  deleteStation,
};

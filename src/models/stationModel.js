/**
 * Station Model Utilities
 *
 * Provides helper functions for common Station database operations.
 * Stations represent physical work posts that can be assigned to schedules.
 */

'use strict';

const { prisma } = require('../config/database');

/**
 * Default station select fields
 */
const STATION_SELECT = {
  id: true,
  name: true,
  location: true,
  capacity: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Find a station by its unique ID.
 *
 * @param {string} id - Station UUID
 * @param {boolean} [includeSchedules=false] - Whether to include related schedules
 * @returns {Promise<Object|null>} Station object or null if not found
 */
async function findStationById(id, includeSchedules = false) {
  return prisma.station.findUnique({
    where: { id },
    select: includeSchedules
      ? {
          ...STATION_SELECT,
          schedules: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              userId: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { startTime: 'asc' },
          },
        }
      : STATION_SELECT,
  });
}

/**
 * List all stations with optional filtering and pagination.
 *
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.status] - Filter by status (ACTIVE|CLOSED)
 * @param {string} [options.search] - Search by name or location
 * @returns {Promise<{stations: Object[], total: number, page: number, limit: number}>}
 */
async function listStations({ page = 1, limit = 20, status, search } = {}) {
  const where = {};

  if (status) where.status = status;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [stations, total] = await Promise.all([
    prisma.station.findMany({
      where,
      select: STATION_SELECT,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.station.count({ where }),
  ]);

  return { stations, total, page, limit };
}

/**
 * Create a new station.
 *
 * @param {Object} data - Station data
 * @param {string} data.name - Station name
 * @param {string} data.location - Station location/sector
 * @param {number} data.capacity - Max staff capacity
 * @param {string} [data.status='ACTIVE'] - Station status
 * @param {string} [data.notes] - Optional notes
 * @returns {Promise<Object>} Created station
 */
async function createStation(data) {
  return prisma.station.create({
    data,
    select: STATION_SELECT,
  });
}

/**
 * Update an existing station.
 *
 * @param {string} id - Station UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated station
 */
async function updateStation(id, data) {
  return prisma.station.update({
    where: { id },
    data,
    select: STATION_SELECT,
  });
}

/**
 * Delete a station (cascades to schedules).
 *
 * @param {string} id - Station UUID
 * @returns {Promise<Object>} Deleted station
 */
async function deleteStation(id) {
  return prisma.station.delete({
    where: { id },
    select: STATION_SELECT,
  });
}

/**
 * Check if a station exists and is active.
 *
 * @param {string} id - Station UUID
 * @returns {Promise<boolean>}
 */
async function isStationActive(id) {
  const station = await prisma.station.findUnique({
    where: { id },
    select: { status: true },
  });
  return station?.status === 'ACTIVE';
}

module.exports = {
  STATION_SELECT,
  findStationById,
  listStations,
  createStation,
  updateStation,
  deleteStation,
  isStationActive,
};

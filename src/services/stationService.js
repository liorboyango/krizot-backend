/**
 * Station Service
 * Business logic for station management operations.
 * Handles CRUD operations, validation, and data transformation.
 */

const { getPrismaClient } = require('../config/database');
const { AppError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * List all stations with optional filtering and pagination.
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} [options.search] - Search term for name/location
 * @param {string} [options.status] - Filter by status ('active' | 'closed')
 * @param {string} [options.sortBy] - Field to sort by
 * @param {string} [options.sortOrder] - Sort direction ('asc' | 'desc')
 * @returns {Promise<{stations: Array, total: number, page: number, totalPages: number}>}
 */
async function listStations(options = {}) {
  const prisma = getPrismaClient();

  const {
    page = 1,
    limit = 20,
    search = '',
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { location: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status.toLowerCase();
  }

  // Validate sortBy field to prevent injection
  const allowedSortFields = ['name', 'location', 'capacity', 'status', 'createdAt', 'updatedAt'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  try {
    const [stations, total] = await Promise.all([
      prisma.station.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: safeSortOrder },
        include: {
          _count: {
            select: { schedules: true },
          },
        },
      }),
      prisma.station.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info(`Listed ${stations.length} stations (page ${page}/${totalPages})`);

    return {
      stations: stations.map(formatStation),
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    logger.error('Error listing stations:', error);
    throw new AppError('Failed to retrieve stations', 500);
  }
}

/**
 * Get a single station by ID.
 *
 * @param {string} id - Station UUID
 * @returns {Promise<Object>} Station object
 * @throws {NotFoundError} If station not found
 */
async function getStationById(id) {
  const prisma = getPrismaClient();

  try {
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        schedules: {
          orderBy: { startTime: 'asc' },
          take: 10,
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: { schedules: true },
        },
      },
    });

    if (!station) {
      throw new NotFoundError(`Station with ID '${id}' not found`);
    }

    logger.info(`Retrieved station: ${station.id} (${station.name})`);
    return formatStationDetail(station);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.error(`Error retrieving station ${id}:`, error);
    throw new AppError('Failed to retrieve station', 500);
  }
}

/**
 * Create a new station.
 *
 * @param {Object} data - Station data
 * @param {string} data.name - Station name
 * @param {string} data.location - Station location/sector
 * @param {number} data.capacity - Staff capacity (1-20)
 * @param {string} [data.status] - Station status ('active' | 'closed')
 * @param {string} [data.notes] - Optional notes
 * @returns {Promise<Object>} Created station
 * @throws {ConflictError} If station name already exists
 */
async function createStation(data) {
  const prisma = getPrismaClient();

  const { name, location, capacity, status = 'active', notes = '' } = data;

  try {
    // Check for duplicate station name
    const existing = await prisma.station.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictError(`A station with the name '${name}' already exists`);
    }

    const station = await prisma.station.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        capacity: parseInt(capacity, 10),
        status: status.toLowerCase(),
        notes: notes ? notes.trim() : '',
      },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
    });

    logger.info(`Created station: ${station.id} (${station.name})`);
    return formatStation(station);
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    logger.error('Error creating station:', error);
    throw new AppError('Failed to create station', 500);
  }
}

/**
 * Update an existing station.
 *
 * @param {string} id - Station UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated station
 * @throws {NotFoundError} If station not found
 * @throws {ConflictError} If new name conflicts with existing station
 */
async function updateStation(id, data) {
  const prisma = getPrismaClient();

  // Verify station exists
  const existing = await prisma.station.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Station with ID '${id}' not found`);
  }

  // If name is being changed, check for conflicts
  if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    try {
      const nameConflict = await prisma.station.findFirst({
        where: {
          name: { equals: data.name.trim(), mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new ConflictError(`A station with the name '${data.name}' already exists`);
      }
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      logger.error('Error checking station name conflict:', error);
      throw new AppError('Failed to validate station name', 500);
    }
  }

  // Build update payload (only include provided fields)
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.location !== undefined) updateData.location = data.location.trim();
  if (data.capacity !== undefined) updateData.capacity = parseInt(data.capacity, 10);
  if (data.status !== undefined) updateData.status = data.status.toLowerCase();
  if (data.notes !== undefined) updateData.notes = data.notes.trim();

  try {
    const station = await prisma.station.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { schedules: true },
        },
      },
    });

    logger.info(`Updated station: ${station.id} (${station.name})`);
    return formatStation(station);
  } catch (error) {
    logger.error(`Error updating station ${id}:`, error);
    throw new AppError('Failed to update station', 500);
  }
}

/**
 * Delete a station by ID.
 * Checks for active schedules before deletion.
 *
 * @param {string} id - Station UUID
 * @param {boolean} [force=false] - Force delete even with active schedules
 * @returns {Promise<{message: string, id: string}>}
 * @throws {NotFoundError} If station not found
 * @throws {ConflictError} If station has active schedules and force=false
 */
async function deleteStation(id, force = false) {
  const prisma = getPrismaClient();

  // Verify station exists
  const existing = await prisma.station.findUnique({
    where: { id },
    include: {
      _count: { select: { schedules: true } },
    },
  });

  if (!existing) {
    throw new NotFoundError(`Station with ID '${id}' not found`);
  }

  // Check for active schedules
  if (!force && existing._count.schedules > 0) {
    const activeSchedules = await prisma.schedule.count({
      where: {
        stationId: id,
        endTime: { gte: new Date() },
      },
    });

    if (activeSchedules > 0) {
      throw new ConflictError(
        `Station '${existing.name}' has ${activeSchedules} active schedule(s). ` +
          `Use force=true to delete anyway, or reassign schedules first.`
      );
    }
  }

  try {
    await prisma.station.delete({ where: { id } });
    logger.info(`Deleted station: ${id} (${existing.name})`);
    return { message: `Station '${existing.name}' deleted successfully`, id };
  } catch (error) {
    logger.error(`Error deleting station ${id}:`, error);
    throw new AppError('Failed to delete station', 500);
  }
}

/**
 * Get station statistics summary.
 *
 * @returns {Promise<Object>} Statistics object
 */
async function getStationStats() {
  const prisma = getPrismaClient();

  try {
    const [total, active, closed, totalCapacity] = await Promise.all([
      prisma.station.count(),
      prisma.station.count({ where: { status: 'active' } }),
      prisma.station.count({ where: { status: 'closed' } }),
      prisma.station.aggregate({ _sum: { capacity: true } }),
    ]);

    return {
      total,
      active,
      closed,
      totalCapacity: totalCapacity._sum.capacity || 0,
    };
  } catch (error) {
    logger.error('Error fetching station stats:', error);
    throw new AppError('Failed to retrieve station statistics', 500);
  }
}

// ─── Formatters ────────────────────────────────────────────────────────────────

/**
 * Format a station record for list responses.
 * @param {Object} station - Raw Prisma station record
 * @returns {Object} Formatted station
 */
function formatStation(station) {
  return {
    id: station.id,
    name: station.name,
    location: station.location,
    capacity: station.capacity,
    status: station.status,
    notes: station.notes || '',
    scheduleCount: station._count ? station._count.schedules : undefined,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
  };
}

/**
 * Format a station record for detail responses (includes schedules).
 * @param {Object} station - Raw Prisma station record with relations
 * @returns {Object} Formatted station detail
 */
function formatStationDetail(station) {
  return {
    ...formatStation(station),
    schedules: station.schedules
      ? station.schedules.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          user: s.user || null,
        }))
      : [],
  };
}

module.exports = {
  listStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  getStationStats,
};

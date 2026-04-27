/**
 * Stations Controller
 * Handles HTTP request/response lifecycle for station endpoints.
 * Delegates business logic to StationService.
 */

const stationService = require('../services/stationService');
const logger = require('../utils/logger');

/**
 * GET /api/stations
 * List all stations with optional filtering and pagination.
 *
 * Query params:
 *   - page {number}      Page number (default: 1)
 *   - limit {number}     Items per page (default: 20, max: 100)
 *   - search {string}    Search by name or location
 *   - status {string}    Filter by status ('active' | 'closed')
 *   - sortBy {string}    Sort field (default: 'createdAt')
 *   - sortOrder {string} Sort direction ('asc' | 'desc', default: 'desc')
 */
async function listStations(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Sanitize and clamp query params
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const result = await stationService.listStations({
      page: parsedPage,
      limit: parsedLimit,
      search: String(search).slice(0, 100),
      status: status ? String(status).toLowerCase() : undefined,
      sortBy: String(sortBy),
      sortOrder: String(sortOrder).toLowerCase(),
    });

    res.status(200).json({
      success: true,
      data: result.stations,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stations/:id
 * Get a single station by ID.
 */
async function getStation(req, res, next) {
  try {
    const { id } = req.params;
    const station = await stationService.getStationById(id);

    res.status(200).json({
      success: true,
      data: station,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/stations
 * Create a new station.
 *
 * Body: { name, location, capacity, status?, notes? }
 */
async function createStation(req, res, next) {
  try {
    const { name, location, capacity, status, notes } = req.body;

    const station = await stationService.createStation({
      name,
      location,
      capacity,
      status,
      notes,
    });

    logger.info(`Station created by user ${req.user && req.user.id}: ${station.id}`);

    res.status(201).json({
      success: true,
      message: 'Station created successfully',
      data: station,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/stations/:id
 * Update an existing station.
 *
 * Body: { name?, location?, capacity?, status?, notes? }
 */
async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, capacity, status, notes } = req.body;

    // Build update payload with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const station = await stationService.updateStation(id, updateData);

    logger.info(`Station updated by user ${req.user && req.user.id}: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Station updated successfully',
      data: station,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/stations/:id
 * Delete a station.
 *
 * Query params:
 *   - force {boolean} Force delete even with active schedules
 */
async function deleteStation(req, res, next) {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    const result = await stationService.deleteStation(id, force);

    logger.info(`Station deleted by user ${req.user && req.user.id}: ${id}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stations/stats
 * Get station statistics summary.
 */
async function getStationStats(req, res, next) {
  try {
    const stats = await stationService.getStationStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  getStationStats,
};

/**
 * Stations Controller
 * Handles HTTP request/response for station CRUD operations.
 */

const stationsService = require('../services/stationsService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/stations
 * List all stations with optional pagination, search, and filtering.
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

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const result = await stationsService.listStations({
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      status,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result.stations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (err) {
    logger.error('listStations error', { error: err.message });
    return next(err);
  }
}

/**
 * GET /api/stations/:id
 * Get a single station by ID.
 */
async function getStation(req, res, next) {
  try {
    const { id } = req.params;
    const station = await stationsService.getStationById(id);

    if (!station) {
      return next(new AppError('Station not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: station,
    });
  } catch (err) {
    logger.error('getStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

/**
 * POST /api/stations
 * Create a new station.
 */
async function createStation(req, res, next) {
  try {
    const { name, location, capacity, status, notes } = req.body;

    const station = await stationsService.createStation({
      name,
      location,
      capacity,
      status,
      notes,
    });

    logger.info('Station created', { stationId: station.id, name: station.name, createdBy: req.user.id });

    return res.status(201).json({
      success: true,
      data: station,
      message: 'Station created successfully',
    });
  } catch (err) {
    logger.error('createStation error', { error: err.message });
    return next(err);
  }
}

/**
 * PUT /api/stations/:id
 * Update an existing station.
 */
async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, capacity, status, notes } = req.body;

    const existing = await stationsService.getStationById(id);
    if (!existing) {
      return next(new AppError('Station not found', 404));
    }

    const updated = await stationsService.updateStation(id, {
      name,
      location,
      capacity,
      status,
      notes,
    });

    logger.info('Station updated', { stationId: id, updatedBy: req.user.id });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Station updated successfully',
    });
  } catch (err) {
    logger.error('updateStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

/**
 * DELETE /api/stations/:id
 * Delete a station (soft delete if it has associated schedules).
 */
async function deleteStation(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await stationsService.getStationById(id);
    if (!existing) {
      return next(new AppError('Station not found', 404));
    }

    await stationsService.deleteStation(id);

    logger.info('Station deleted', { stationId: id, deletedBy: req.user.id });

    return res.status(200).json({
      success: true,
      message: 'Station deleted successfully',
    });
  } catch (err) {
    logger.error('deleteStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

module.exports = {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
};

/**
 * Station Controller
 * Handles CRUD operations for station management.
 */

'use strict';

const stationService = require('../services/stationService');
const { sendSuccess, sendCreated, sendNoContent, sendPaginated } = require('../utils/response');

/**
 * GET /api/stations
 * List all stations with pagination and optional filters.
 */
async function listStations(req, res, next) {
  try {
    const { page = 1, perPage = 20, search, status } = req.query;
    const result = await stationService.listStations({
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      search,
      status,
    });
    sendPaginated(res, result.stations, result.pagination);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/stations
 * Create a new station.
 */
async function createStation(req, res, next) {
  try {
    const station = await stationService.createStation(req.body);
    sendCreated(res, station, 'Station created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stations/:id
 * Get a single station by ID.
 */
async function getStationById(req, res, next) {
  try {
    const station = await stationService.getStationById(req.params.id);
    sendSuccess(res, station, 'Station retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/stations/:id
 * Update a station.
 */
async function updateStation(req, res, next) {
  try {
    const station = await stationService.updateStation(req.params.id, req.body);
    sendSuccess(res, station, 'Station updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/stations/:id
 * Delete a station.
 */
async function deleteStation(req, res, next) {
  try {
    await stationService.deleteStation(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStations,
  createStation,
  getStationById,
  updateStation,
  deleteStation,
};

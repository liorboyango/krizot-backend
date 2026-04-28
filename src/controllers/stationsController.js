/**
 * Stations Controller
 * HTTP request/response for station CRUD operations.
 */

'use strict';

const stationsService = require('../services/stationsService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

async function listStations(req, res, next) {
  try {
    const {
      limit = 20,
      cursor,
      search = '',
      status,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const result = await stationsService.listStations({
      limit: limitNum,
      cursor,
      search: search.trim(),
      status,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result.stations,
      pagination: {
        limit: limitNum,
        nextCursor: result.nextCursor,
      },
    });
  } catch (err) {
    logger.error('listStations error', { error: err.message });
    return next(err);
  }
}

async function getStation(req, res, next) {
  try {
    const station = await stationsService.getStationById(req.params.id);
    if (!station) return next(new AppError('Station not found', 404));
    return res.status(200).json({ success: true, data: station });
  } catch (err) {
    logger.error('getStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

async function createStation(req, res, next) {
  try {
    const { name, location, capacity, status, notes } = req.body;
    const station = await stationsService.createStation({ name, location, capacity, status, notes });
    logger.info('Station created', { stationId: station.id, name: station.name, createdBy: req.user.id });
    return res.status(201).json({ success: true, data: station, message: 'Station created successfully' });
  } catch (err) {
    logger.error('createStation error', { error: err.message });
    return next(err);
  }
}

async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await stationsService.getStationById(id);
    if (!existing) return next(new AppError('Station not found', 404));

    const { name, location, capacity, status, notes } = req.body;
    const updated = await stationsService.updateStation(id, { name, location, capacity, status, notes });
    logger.info('Station updated', { stationId: id, updatedBy: req.user.id });
    return res.status(200).json({ success: true, data: updated, message: 'Station updated successfully' });
  } catch (err) {
    logger.error('updateStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

async function deleteStation(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await stationsService.getStationById(id);
    if (!existing) return next(new AppError('Station not found', 404));

    await stationsService.deleteStation(id);
    logger.info('Station deleted', { stationId: id, deletedBy: req.user.id });
    return res.status(200).json({ success: true, message: 'Station deleted successfully' });
  } catch (err) {
    logger.error('deleteStation error', { id: req.params.id, error: err.message });
    return next(err);
  }
}

module.exports = { listStations, getStation, createStation, updateStation, deleteStation };

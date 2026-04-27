/**
 * Station Routes
 * CRUD operations for station management.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const stationController = require('../controllers/stationController');
const {
  createStationSchema,
  updateStationSchema,
  stationIdParamSchema,
  listStationsQuerySchema,
} = require('../validators/stationValidators');

// All station routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stations
 * @desc    List all stations (paginated, filterable)
 * @access  Private (JWT)
 */
router.get(
  '/',
  validateQuery(listStationsQuerySchema),
  stationController.listStations
);

/**
 * @route   POST /api/stations
 * @desc    Create a new station
 * @access  Private (admin)
 */
router.post(
  '/',
  authorize('admin'),
  validateBody(createStationSchema),
  stationController.createStation
);

/**
 * @route   GET /api/stations/:id
 * @desc    Get a single station by ID
 * @access  Private (JWT)
 */
router.get(
  '/:id',
  validateParams(stationIdParamSchema),
  stationController.getStationById
);

/**
 * @route   PUT /api/stations/:id
 * @desc    Update a station
 * @access  Private (admin)
 */
router.put(
  '/:id',
  authorize('admin'),
  validateParams(stationIdParamSchema),
  validateBody(updateStationSchema),
  stationController.updateStation
);

/**
 * @route   DELETE /api/stations/:id
 * @desc    Delete a station
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  validateParams(stationIdParamSchema),
  stationController.deleteStation
);

module.exports = router;

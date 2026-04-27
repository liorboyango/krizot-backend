/**
 * Stations Router
 * Mounts all /api/stations endpoints.
 * All routes require a valid JWT (authenticate middleware).
 */

const express = require('express');
const router = express.Router();

const stationsController = require('../controllers/stationsController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const {
  createStationSchema,
  updateStationSchema,
} = require('../middleware/validators/stationValidators');

// All station routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stations
 * @desc    List all stations (paginated, searchable, filterable)
 * @access  Private (any authenticated user)
 * @query   page, limit, search, status, sortBy, sortOrder
 */
router.get('/', stationsController.listStations);

/**
 * @route   GET /api/stations/:id
 * @desc    Get a single station by ID
 * @access  Private
 */
router.get('/:id', stationsController.getStation);

/**
 * @route   POST /api/stations
 * @desc    Create a new station
 * @access  Private (admin/manager)
 * @body    { name, location, capacity, status?, notes? }
 */
router.post('/', validateBody(createStationSchema), stationsController.createStation);

/**
 * @route   PUT /api/stations/:id
 * @desc    Update an existing station
 * @access  Private (admin/manager)
 * @body    { name?, location?, capacity?, status?, notes? }
 */
router.put('/:id', validateBody(updateStationSchema), stationsController.updateStation);

/**
 * @route   DELETE /api/stations/:id
 * @desc    Delete a station (blocked if future schedules exist)
 * @access  Private (admin/manager)
 */
router.delete('/:id', stationsController.deleteStation);

module.exports = router;

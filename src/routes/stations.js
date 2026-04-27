/**
 * Stations Router
 * Defines all API routes for station management.
 *
 * Base path: /api/stations
 *
 * Routes:
 *   GET    /api/stations          - List all stations (paginated, filterable)
 *   GET    /api/stations/stats    - Get station statistics
 *   GET    /api/stations/:id      - Get single station by ID
 *   POST   /api/stations          - Create a new station
 *   PUT    /api/stations/:id      - Update a station
 *   DELETE /api/stations/:id      - Delete a station
 */

const express = require('express');
const router = express.Router();

const stationsController = require('../controllers/stationsController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const {
  createStationSchema,
  updateStationSchema,
  listStationsQuerySchema,
} = require('../validators/stationValidators');

/**
 * GET /api/stations/stats
 * Get station statistics summary.
 * Auth: JWT required (any authenticated user)
 *
 * NOTE: This route MUST be defined BEFORE /:id to avoid 'stats' being
 * treated as an ID parameter.
 */
router.get('/stats', authenticate, stationsController.getStationStats);

/**
 * GET /api/stations
 * List all stations with optional filtering and pagination.
 * Auth: JWT required
 */
router.get(
  '/',
  authenticate,
  validateQuery(listStationsQuerySchema),
  stationsController.listStations
);

/**
 * GET /api/stations/:id
 * Get a single station by ID.
 * Auth: JWT required
 */
router.get('/:id', authenticate, stationsController.getStation);

/**
 * POST /api/stations
 * Create a new station.
 * Auth: JWT required, admin or manager role
 *
 * Body: { name, location, capacity, status?, notes? }
 */
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'manager']),
  validateBody(createStationSchema),
  stationsController.createStation
);

/**
 * PUT /api/stations/:id
 * Update an existing station.
 * Auth: JWT required, admin or manager role
 *
 * Body: { name?, location?, capacity?, status?, notes? }
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['admin', 'manager']),
  validateBody(updateStationSchema),
  stationsController.updateStation
);

/**
 * DELETE /api/stations/:id
 * Delete a station.
 * Auth: JWT required, admin role only
 *
 * Query params:
 *   force {boolean} - Force delete even with active schedules
 */
router.delete('/:id', authenticate, requireRole(['admin']), stationsController.deleteStation);

module.exports = router;

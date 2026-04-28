/**
 * Station Routes
 *
 * GET    /api/stations        - List stations
 * POST   /api/stations        - Create a new station
 * GET    /api/stations/:id    - Get a single station
 * PUT    /api/stations/:id    - Update a station
 * DELETE /api/stations/:id    - Delete a station (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();

const stationsController = require('../controllers/stationsController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.get(
  '/',
  authenticate,
  validate({ query: schemas.pagination }),
  stationsController.listStations
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.createStation }),
  stationsController.createStation
);

router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  stationsController.getStation
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate({ params: schemas.idParam, body: schemas.updateStation }),
  stationsController.updateStation
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  stationsController.deleteStation
);

module.exports = router;

/**
 * Schedule Routes
 *
 * GET    /api/schedules         - List schedules (filterable, cursor pagination)
 * POST   /api/schedules         - Create a single schedule
 * POST   /api/schedules/assign  - Bulk assign shifts with conflict detection
 * GET    /api/schedules/weekly  - Weekly grid view
 * GET    /api/schedules/stats   - Dashboard stats
 * GET    /api/schedules/:id     - Get a single schedule
 * PUT    /api/schedules/:id     - Update a schedule
 * DELETE /api/schedules/:id     - Delete a schedule (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();

const schedulesController = require('../controllers/schedulesController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.get('/', authenticate, schedulesController.listSchedules);

router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.createSchedule }),
  schedulesController.createSchedule
);

router.post(
  '/assign',
  authenticate,
  authorize('admin', 'manager'),
  validate({ body: schemas.assignSchedules }),
  schedulesController.assignShifts
);

router.get('/weekly', authenticate, schedulesController.getWeeklySchedule);

router.get('/stats', authenticate, schedulesController.getScheduleStats);

router.get(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam }),
  schedulesController.getSchedule
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate({ params: schemas.idParam, body: schemas.createSchedule }),
  schedulesController.updateSchedule
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  schedulesController.deleteSchedule
);

module.exports = router;

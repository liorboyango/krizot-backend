/**
 * Station Routes
 * GET    /api/stations       - List all stations
 * POST   /api/stations       - Create a new station
 * GET    /api/stations/:id   - Get station by ID
 * PUT    /api/stations/:id   - Update station
 * DELETE /api/stations/:id   - Delete station
 */

'use strict';

const express = require('express');
const router = express.Router();

// Placeholder routes - will be implemented in subsequent tasks
router.get('/', (req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

router.post('/', (req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

router.get('/:id', (req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

router.put('/:id', (req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

module.exports = router;

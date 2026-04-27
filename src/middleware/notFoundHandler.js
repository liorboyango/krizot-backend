/**
 * 404 Not Found Handler
 * Catches requests to undefined routes.
 */

'use strict';

/**
 * Middleware to handle requests to undefined routes.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

module.exports = { notFoundHandler };

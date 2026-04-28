/**
 * Global Error Handling Middleware
 *
 * Catches all errors forwarded via next(err) and returns a consistent
 * JSON error response.
 */

'use strict';

const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  const { NotFoundError } = require('../utils/errors');
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const error = err;
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational === true;

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
    });
  } else {
    logger.warn('Client error', {
      message: error.message,
      code: error.code,
      statusCode,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    });
  }

  const config = require('../config/env');
  const body = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: isOperational ? error.message : 'An unexpected error occurred',
    },
  };
  if (error.details) body.error.details = error.details;
  if (error.conflicts) body.error.conflicts = error.conflicts;
  if (!config.isProduction && error.stack) body.error.stack = error.stack;

  return res.status(statusCode).json(body);
};

module.exports = { errorHandler, notFoundHandler };

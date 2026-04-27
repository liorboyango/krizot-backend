/**
 * Request ID Middleware
 *
 * Attaches a unique ID to every incoming request for log correlation.
 * Uses the X-Request-ID header if provided by a proxy, otherwise generates one.
 */

'use strict';

const { randomUUID } = require('crypto');

/**
 * Attaches req.id and sets X-Request-ID response header.
 */
const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = requestId;

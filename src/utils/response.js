/**
 * Standardized API Response Helpers
 *
 * Ensures all API responses follow a consistent envelope format:
 *   { success, data, message, meta }
 */

'use strict';

/**
 * Send a successful response.
 *
 * @param {object} res        - Express response object
 * @param {*}      data       - Response payload
 * @param {string} [message]  - Optional human-readable message
 * @param {number} [status]   - HTTP status code (default 200)
 * @param {object} [meta]     - Optional metadata (pagination, etc.)
 */
const sendSuccess = (res, data, message = 'Success', status = 200, meta = null) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

/**
 * Send a created (201) response.
 *
 * @param {object} res       - Express response object
 * @param {*}      data      - Created resource
 * @param {string} [message] - Optional message
 */
const sendCreated = (res, data, message = 'Resource created successfully') =>
  sendSuccess(res, data, message, 201);

/**
 * Send a no-content (204) response.
 *
 * @param {object} res - Express response object
 */
const sendNoContent = (res) => res.status(204).send();

/**
 * Send a paginated list response.
 *
 * @param {object} res      - Express response object
 * @param {Array}  items    - Array of items
 * @param {object} pagination - { page, limit, total, totalPages }
 * @param {string} [message]
 */
const sendPaginated = (res, items, pagination, message = 'Success') =>
  sendSuccess(res, items, message, 200, { pagination });

/**
 * Build pagination metadata.
 *
 * @param {number} page  - Current page (1-based)
 * @param {number} limit - Items per page
 * @param {number} total - Total item count
 * @returns {object} Pagination metadata
 */
const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = { sendSuccess, sendCreated, sendNoContent, sendPaginated, buildPagination };

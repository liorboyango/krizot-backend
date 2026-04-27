/**
 * Response Utility
 * Standardized API response helpers for consistent JSON output.
 */

'use strict';

/**
 * Send a successful response.
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send a paginated list response.
 * @param {object} res - Express response object
 * @param {Array} items - Array of items
 * @param {object} pagination - Pagination metadata
 * @param {number} pagination.total - Total number of items
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.perPage - Items per page
 * @param {string} [message] - Optional message
 */
function sendPaginated(res, items, pagination, message = 'Success') {
  const { total, page, perPage } = pagination;
  const totalPages = Math.ceil(total / perPage);

  // Set pagination headers
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(perPage));

  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total,
      page,
      perPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

/**
 * Send a created response (201).
 * @param {object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message] - Optional message
 */
function sendCreated(res, data, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a no-content response (204).
 * @param {object} res - Express response object
 */
function sendNoContent(res) {
  return res.status(204).send();
}

module.exports = { sendSuccess, sendPaginated, sendCreated, sendNoContent };

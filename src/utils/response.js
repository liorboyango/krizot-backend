/**
 * Response Utility
 * Standardized API response helpers
 */

'use strict';

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a paginated list response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} total - Total count of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {string} [message] - Optional message
 */
const sendPaginated = (res, items, total, page, limit, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);

  // Set pagination headers
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(totalPages));

  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Send a created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message] - Optional message
 */
const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a no-content response (204)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

module.exports = { sendSuccess, sendPaginated, sendCreated, sendNoContent };

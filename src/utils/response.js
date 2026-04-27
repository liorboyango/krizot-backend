/**
 * Response Utility
 * Standardized API response format helpers
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
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
 * Send a created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message] - Optional message
 */
function sendCreated(res, data, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a paginated list response
 * @param {Object} res - Express response object
 * @param {Array} items - List items
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.total
 * @param {number} pagination.page
 * @param {number} pagination.limit
 * @param {number} pagination.totalPages
 * @param {string} [message]
 */
function sendPaginated(res, items, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
  });
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {string} [code] - Machine-readable error code
 * @param {*} [details] - Additional error details
 */
function sendError(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) response.error.details = details;

  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
};

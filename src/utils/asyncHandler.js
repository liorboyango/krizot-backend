/**
 * Async Route Handler Wrapper
 *
 * Wraps async Express route handlers to automatically catch rejected
 * promises and forward them to the next() error handler.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */

'use strict';

/**
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Express middleware that catches async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

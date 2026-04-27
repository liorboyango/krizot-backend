/**
 * Authentication Middleware
 * JWT verification and role-based access control (RBAC).
 */

'use strict';

const { verifyAccessToken } = require('../config/jwt');
const { AppError } = require('../utils/errors');

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 * Attaches decoded user payload to req.user.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Authorization header missing or malformed. Expected: Bearer <token>',
        401,
        'AUTH_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token not provided', 401, 'AUTH_MISSING');
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory for role-based access control.
 * Restricts access to users with specified roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager')
 * @returns {function} Express middleware
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTH_REQUIRED')
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${roles.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

module.exports = { authenticate, authorize };

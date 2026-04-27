/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens and enforces role-based access control (RBAC).
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * authenticate
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 *
 * @type {import('express').RequestHandler}
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please provide a valid token.', 401));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Authentication token is missing', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired. Please log in again.', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    logger.error('JWT verification error', { error: err.message });
    return next(new AppError('Authentication failed', 401));
  }
}

/**
 * authorize
 * Role-based access control middleware factory.
 * Call with one or more allowed roles.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'manager')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.delete('/:id', authenticate, authorize('admin'), controller.delete);
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
          403
        )
      );
    }

    return next();
  };
}

module.exports = { authenticate, authorize };

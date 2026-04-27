/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control (RBAC).
 */

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authenticate middleware.
 * Verifies the JWT token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization token is required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Authorization token is required');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      throw new Error('Server configuration error');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired. Please log in again.');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token. Please log in again.');
      }
      throw new UnauthorizedError('Token verification failed');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based access control middleware factory.
 * Returns middleware that checks if the authenticated user has one of the allowed roles.
 *
 * @param {string[]} allowedRoles - Array of roles that are permitted
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/stations', authenticate, requireRole(['admin', 'manager']), handler);
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Access denied: user ${req.user.id} (role: ${req.user.role}) ` +
          `attempted to access resource requiring roles: [${allowedRoles.join(', ')}]`
      );
      return next(
        new ForbiddenError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
}

module.exports = { authenticate, requireRole };

/**
 * Authentication & Authorization Middleware
 *
 * Provides JWT verification, role-based access control (RBAC),
 * and token blacklist checking for secure API access.
 */

const jwt = require('jsonwebtoken');
const { tokenBlacklist } = require('../utils/tokenBlacklist');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Extracts the Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * authenticate middleware
 *
 * Verifies the JWT access token attached to the request.
 * Sets req.user = { id, email, role } on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('Authentication required. Please provide a valid Bearer token.', 401);
    }

    // Check if token has been blacklisted (logged out)
    if (tokenBlacklist.has(token)) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Access token has expired. Please refresh your token.', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token. Please log in again.', 401);
      }
      throw new AppError('Token verification failed.', 401);
    }

    // Ensure this is an access token, not a refresh token
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type. Access token required.', 401);
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug(`Authenticated user: ${decoded.email} (role: ${decoded.role})`);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * authorize middleware factory
 *
 * Returns a middleware that restricts access to users with the specified roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.delete('/stations/:id', authenticate, authorize('admin'), deleteStation);
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Authorization denied for user ${req.user.email} (role: ${req.user.role}). Required: ${roles.join(', ')}`
      );
      return next(
        new AppError(
          `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * optionalAuthenticate middleware
 *
 * Like authenticate, but does NOT fail if no token is provided.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    if (tokenBlacklist.has(token)) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === 'access') {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      } else {
        req.user = null;
      }
    } catch {
      req.user = null;
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, authorize, optionalAuthenticate };

/**
 * Authentication & Authorization Middleware
 * JWT verification and role-based access control (RBAC).
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// In-memory token blacklist (for logout invalidation).
// In production, use Redis for distributed deployments.
const tokenBlacklist = new Set();

/**
 * Middleware: Verify JWT token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (tokenBlacklist.has(token)) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET environment variable is not set');
      throw new AppError('Server configuration error', 500);
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired. Please log in again.', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    next(new AppError('Authentication failed', 401));
  }
}

/**
 * Middleware factory: Require specific roles.
 * @param {string[]} roles - Allowed roles (e.g., ['admin', 'manager'])
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Add a token to the blacklist (used on logout).
 * @param {string} token
 */
function blacklistToken(token) {
  tokenBlacklist.add(token);
  // Schedule cleanup after token expiry (default 15 minutes)
  const expiryMs = 15 * 60 * 1000;
  setTimeout(() => tokenBlacklist.delete(token), expiryMs);
}

module.exports = { authenticate, requireRole, blacklistToken };

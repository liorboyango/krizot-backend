/**
 * Authentication Middleware
 * JWT verification and role-based access control (RBAC)
 */

'use strict';

const { verifyAccessToken } = require('../config/jwt');
const { prisma } = require('../config/database');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authenticate middleware - verifies JWT token
 * Attaches decoded user to req.user
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or malformed', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    // Verify token signature and expiry
    const decoded = verifyAccessToken(token);

    // Fetch fresh user data from DB to ensure user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw new AppError('User not found or account deactivated', 401);
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize middleware factory - checks user role
 * Must be used AFTER authenticate middleware
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager')
 * @returns {Function} Express middleware
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} (role: ${req.user.role}) to ${req.method} ${req.path}`);
      return next(new AppError(`Access denied. Required role(s): ${roles.join(', ')}`, 403));
    }

    next();
  };
};

module.exports = { authenticate, authorize };

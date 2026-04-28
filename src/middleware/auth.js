/**
 * Authentication & Authorization Middleware (Firebase Auth)
 *
 * Verifies a Firebase ID token from the Authorization: Bearer <token> header.
 * Role-based access control reads the `role` custom claim attached to the
 * Firebase user (set during registration / role updates).
 */

'use strict';

const { auth } = require('../config/firebaseAdmin');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function verifyAndAttachUser(req, token) {
  const decoded = await auth.verifyIdToken(token, true);
  req.user = {
    id: decoded.uid,
    uid: decoded.uid,
    email: decoded.email,
    role: decoded.role || 'manager',
  };
  return req.user;
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Authentication required. Please provide a valid Bearer token.', 401);
    }

    try {
      await verifyAndAttachUser(req, token);
    } catch (err) {
      if (err && err.code === 'auth/id-token-expired') {
        throw new AppError('Access token has expired. Please refresh your token.', 401);
      }
      if (err && err.code === 'auth/id-token-revoked') {
        throw new AppError('Token has been revoked. Please log in again.', 401);
      }
      logger.warn('ID token verification failed', { code: err && err.code, message: err && err.message });
      throw new AppError('Invalid token. Please log in again.', 401);
    }

    logger.debug(`Authenticated user: ${req.user.email} (role: ${req.user.role})`);
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required.', 401));
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

async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    try {
      await verifyAndAttachUser(req, token);
    } catch {
      req.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, authorize, optionalAuthenticate };

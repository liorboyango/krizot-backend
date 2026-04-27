/**
 * JWT Configuration
 * Token generation, verification, and secret management.
 */

'use strict';

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate an access token for a user.
 * @param {object} payload - Token payload (userId, email, role)
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET || 'test-secret',
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

/**
 * Generate a refresh token for a user.
 * @param {object} payload - Token payload (userId)
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    { userId: payload.userId },
    JWT_REFRESH_SECRET || JWT_SECRET || 'test-refresh-secret',
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

/**
 * Verify and decode an access token.
 * @param {string} token - JWT token string
 * @returns {object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET || 'test-secret');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid access token', 401, 'TOKEN_INVALID');
    }
    throw new AppError('Token verification failed', 401, 'TOKEN_ERROR');
  }
}

/**
 * Verify and decode a refresh token.
 * @param {string} token - JWT refresh token string
 * @returns {object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(
      token,
      JWT_REFRESH_SECRET || JWT_SECRET || 'test-refresh-secret'
    );
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new AppError('Invalid refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
};

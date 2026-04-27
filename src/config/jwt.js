/**
 * JWT Configuration
 * Token generation and verification utilities
 */

'use strict';

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production');
  }
}

/**
 * Generate an access token (short-lived)
 * @param {Object} payload - Token payload (userId, email, role)
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: JWT_ACCESS_EXPIRY, issuer: 'krizot-api' }
  );
};

/**
 * Generate a refresh token (long-lived)
 * @param {Object} payload - Token payload (userId)
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    { expiresIn: JWT_REFRESH_EXPIRY, issuer: 'krizot-api' }
  );
};

/**
 * Verify an access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'dev-secret-change-in-production', {
      issuer: 'krizot-api',
    });
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token expired', 401);
    }
    throw new AppError('Invalid access token', 401);
  }
};

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      { issuer: 'krizot-api' }
    );
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
};

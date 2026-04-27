/**
 * JWT Utility
 *
 * Helpers for generating and verifying access and refresh tokens.
 * Access tokens expire in 15 minutes; refresh tokens expire in 7 days.
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generates a JWT access token.
 *
 * @param {{ id: string, email: string, role: string }} payload
 * @returns {string} Signed JWT
 */
function generateAccessToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, issuer: 'krizot-api' }
  );
}

/**
 * Generates a JWT refresh token.
 *
 * @param {{ id: string, email: string }} payload
 * @returns {string} Signed JWT
 */
function generateRefreshToken(payload) {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
  }
  return jwt.sign(
    { id: payload.id, email: payload.email, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY, issuer: 'krizot-api' }
  );
}

/**
 * Verifies a refresh token.
 *
 * @param {string} token
 * @returns {{ id: string, email: string, type: string }}
 * @throws {AppError} on invalid/expired token
 */
function verifyRefreshToken(token) {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type. Refresh token required.', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired. Please log in again.', 401);
    }
    throw new AppError('Invalid refresh token.', 401);
  }
}

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };

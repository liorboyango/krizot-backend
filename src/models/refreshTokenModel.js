/**
 * RefreshToken Model Utilities
 *
 * Provides helper functions for JWT refresh token management.
 * Supports token rotation and blacklisting for secure auth.
 */

'use strict';

const { prisma } = require('../config/database');

/**
 * Store a new refresh token.
 *
 * @param {string} userId - User UUID
 * @param {string} token - Refresh token string
 * @param {Date} expiresAt - Token expiration date
 * @returns {Promise<Object>} Created refresh token record
 */
async function createRefreshToken(userId, token, expiresAt) {
  return prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

/**
 * Find a refresh token by its value.
 *
 * @param {string} token - Refresh token string
 * @returns {Promise<Object|null>} Token record or null
 */
async function findRefreshToken(token) {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
  });
}

/**
 * Revoke a specific refresh token (logout).
 *
 * @param {string} token - Refresh token string
 * @returns {Promise<Object>} Updated token record
 */
async function revokeRefreshToken(token) {
  return prisma.refreshToken.update({
    where: { token },
    data: { isRevoked: true },
  });
}

/**
 * Revoke all refresh tokens for a user (logout all devices).
 *
 * @param {string} userId - User UUID
 * @returns {Promise<{count: number}>} Number of revoked tokens
 */
async function revokeAllUserTokens(userId) {
  return prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Delete expired and revoked tokens (cleanup job).
 *
 * @returns {Promise<{count: number}>} Number of deleted tokens
 */
async function cleanupExpiredTokens() {
  return prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true },
      ],
    },
  });
}

module.exports = {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
};

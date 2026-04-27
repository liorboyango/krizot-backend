/**
 * Authentication Service
 * Business logic for user authentication, token management.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../config/database');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../config/jwt');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authenticate a user with email and password.
 * @param {string} email - User email
 * @param {string} password - Plain-text password
 * @returns {object} { user, accessToken, refreshToken }
 * @throws {AppError} If credentials are invalid
 */
async function login(email, password) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      name: true,
      isActive: true,
    },
  });

  if (!user) {
    // Use generic message to prevent user enumeration
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token hash in DB
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshTokenHash },
  });

  logger.info(`User logged in: ${user.email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 * @param {string} refreshToken - JWT refresh token
 * @returns {object} { accessToken, refreshToken }
 * @throws {AppError} If refresh token is invalid
 */
async function refreshToken(refreshToken) {
  const prisma = getPrismaClient();

  const decoded = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      role: true,
      refreshToken: true,
      isActive: true,
    },
  });

  if (!user || !user.refreshToken) {
    throw new AppError('Invalid refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
  }

  // Verify the stored refresh token matches
  const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isTokenValid) {
    throw new AppError('Invalid refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Rotate refresh token
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshTokenHash },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout a user by invalidating their refresh token.
 * @param {string} userId - User ID
 */
async function logout(userId) {
  const prisma = getPrismaClient();

  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  logger.info(`User logged out: ${userId}`);
}

/**
 * Get a user by ID (for /me endpoint).
 * @param {string} userId - User ID
 * @returns {object} User profile (without sensitive fields)
 * @throws {NotFoundError} If user not found
 */
async function getUserById(userId) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

module.exports = { login, refreshToken, logout, getUserById };

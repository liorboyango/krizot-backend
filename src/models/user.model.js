/**
 * User Model Utilities
 * Type-safe operations and helpers for the User entity
 */

const { prisma } = require('../config/database');
const { AppError } = require('../utils/errors');

/**
 * User roles enum
 */
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
};

/**
 * Safe user fields to return (excludes password)
 */
const USER_SAFE_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Find a user by ID
 * @param {string} id - User UUID
 * @param {boolean} includePassword - Whether to include password hash
 * @returns {Promise<Object|null>}
 */
async function findUserById(id, includePassword = false) {
  return prisma.user.findUnique({
    where: { id },
    select: includePassword ? undefined : USER_SAFE_FIELDS,
  });
}

/**
 * Find a user by email
 * @param {string} email - User email address
 * @param {boolean} includePassword - Whether to include password hash
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email, includePassword = false) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: includePassword
      ? undefined
      : USER_SAFE_FIELDS,
  });
}

/**
 * Create a new user
 * @param {Object} data - User creation data
 * @param {string} data.email
 * @param {string} data.password - Already hashed password
 * @param {string} data.firstName
 * @param {string} data.lastName
 * @param {string} [data.role]
 * @returns {Promise<Object>} Created user (without password)
 */
async function createUser(data) {
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role || UserRole.MANAGER,
      isActive: true,
    },
    select: USER_SAFE_FIELDS,
  });
  return user;
}

/**
 * Update a user
 * @param {string} id - User UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated user (without password)
 */
async function updateUser(id, data) {
  const updateData = {};

  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password !== undefined) updateData.password = data.password;

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SAFE_FIELDS,
  });
}

/**
 * Soft-delete a user (set isActive = false)
 * @param {string} id - User UUID
 * @returns {Promise<Object>}
 */
async function deactivateUser(id) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: USER_SAFE_FIELDS,
  });
}

/**
 * List users with pagination and filtering
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.role] - Filter by role
 * @param {boolean} [options.isActive] - Filter by active status
 * @param {string} [options.search] - Search by name or email
 * @returns {Promise<{users: Array, total: number, page: number, totalPages: number}>}
 */
async function listUsers({ page = 1, limit = 20, role, isActive, search } = {}) {
  const skip = (page - 1) * limit;

  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SAFE_FIELDS,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Check if email is already taken (excluding a specific user)
 * @param {string} email
 * @param {string} [excludeId] - User ID to exclude from check
 * @returns {Promise<boolean>}
 */
async function isEmailTaken(email, excludeId = null) {
  const where = { email: email.toLowerCase().trim() };
  if (excludeId) where.id = { not: excludeId };

  const count = await prisma.user.count({ where });
  return count > 0;
}

/**
 * Store a refresh token for a user
 * @param {string} userId
 * @param {string} token
 * @param {Date} expiresAt
 * @returns {Promise<Object>}
 */
async function storeRefreshToken(userId, token, expiresAt) {
  return prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

/**
 * Find a valid (non-expired, non-revoked) refresh token
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
async function findRefreshToken(token) {
  return prisma.refreshToken.findFirst({
    where: {
      token,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: USER_SAFE_FIELDS } },
  });
}

/**
 * Revoke a specific refresh token
 * @param {string} token
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
}

/**
 * Revoke all refresh tokens for a user (logout all devices)
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Clean up expired refresh tokens (maintenance task)
 * @returns {Promise<number>} Number of deleted tokens
 */
async function cleanExpiredTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

module.exports = {
  UserRole,
  USER_SAFE_FIELDS,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  deactivateUser,
  listUsers,
  isEmailTaken,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanExpiredTokens,
};

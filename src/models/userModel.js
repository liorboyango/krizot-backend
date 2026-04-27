/**
 * User Model Utilities
 *
 * Provides helper functions for common User database operations.
 * All sensitive fields (password) are excluded from default selects.
 */

'use strict';

const { prisma } = require('../config/database');

/**
 * Default user select fields (excludes password for security)
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Find a user by their unique ID.
 *
 * @param {string} id - User UUID
 * @param {boolean} [includePassword=false] - Whether to include the hashed password
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findUserById(id, includePassword = false) {
  return prisma.user.findUnique({
    where: { id },
    select: includePassword ? { ...USER_SELECT, password: true } : USER_SELECT,
  });
}

/**
 * Find a user by their email address.
 *
 * @param {string} email - User email
 * @param {boolean} [includePassword=false] - Whether to include the hashed password
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findUserByEmail(email, includePassword = false) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: includePassword ? { ...USER_SELECT, password: true } : USER_SELECT,
  });
}

/**
 * List all users with optional filtering and pagination.
 *
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.role] - Filter by role (ADMIN|MANAGER)
 * @param {boolean} [options.isActive] - Filter by active status
 * @returns {Promise<{users: Object[], total: number, page: number, limit: number}>}
 */
async function listUsers({ page = 1, limit = 20, role, isActive } = {}) {
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

/**
 * Create a new user.
 *
 * @param {Object} data - User data
 * @param {string} data.email - User email
 * @param {string} data.password - Hashed password
 * @param {string} data.name - User display name
 * @param {string} [data.role='MANAGER'] - User role
 * @returns {Promise<Object>} Created user (without password)
 */
async function createUser(data) {
  return prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
    },
    select: USER_SELECT,
  });
}

/**
 * Update an existing user.
 *
 * @param {string} id - User UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated user (without password)
 */
async function updateUser(id, data) {
  const updateData = { ...data };
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  });
}

/**
 * Soft-delete a user by setting isActive to false.
 *
 * @param {string} id - User UUID
 * @returns {Promise<Object>} Updated user
 */
async function deactivateUser(id) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: USER_SELECT,
  });
}

/**
 * Hard-delete a user (use with caution).
 *
 * @param {string} id - User UUID
 * @returns {Promise<Object>} Deleted user
 */
async function deleteUser(id) {
  return prisma.user.delete({
    where: { id },
    select: USER_SELECT,
  });
}

module.exports = {
  USER_SELECT,
  findUserById,
  findUserByEmail,
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  deleteUser,
};

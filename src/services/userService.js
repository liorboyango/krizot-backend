/**
 * User Service
 * Business logic for user CRUD operations.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errors');

const BCRYPT_ROUNDS = 12;

/**
 * List users with pagination and optional filters.
 * @param {object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.perPage - Items per page
 * @param {string} [options.search] - Search by name or email
 * @param {string} [options.role] - Filter by role
 * @returns {object} { users, pagination }
 */
async function listUsers({ page = 1, perPage = 20, search, role } = {}) {
  const prisma = getPrismaClient();
  const skip = (page - 1) * perPage;

  const where = {
    isActive: true,
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: { total, page, perPage },
  };
}

/**
 * Create a new user.
 * @param {object} data - User data
 * @returns {object} Created user (without password)
 * @throws {ConflictError} If email already exists
 */
async function createUser(data) {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      name: data.name,
      role: data.role || 'manager',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Get a user by ID.
 * @param {string} id - User ID
 * @returns {object} User data
 * @throws {NotFoundError} If user not found
 */
async function getUserById(id) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

/**
 * Update a user.
 * @param {string} id - User ID
 * @param {object} data - Fields to update
 * @returns {object} Updated user
 * @throws {NotFoundError} If user not found
 */
async function updateUser(id, data) {
  const prisma = getPrismaClient();

  // Check user exists
  await getUserById(id);

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Soft-delete a user by setting isActive to false.
 * @param {string} id - User ID
 * @throws {NotFoundError} If user not found
 */
async function deleteUser(id) {
  const prisma = getPrismaClient();

  await getUserById(id);

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
}

module.exports = { listUsers, createUser, getUserById, updateUser, deleteUser };

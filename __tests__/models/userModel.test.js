/**
 * Unit Tests - User Model Utilities
 */

'use strict';

// Mock the Prisma client
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/config/database');
const {
  findUserById,
  findUserByEmail,
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
} = require('../../src/models/userModel');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserById', () => {
    it('should find a user by ID without password', async () => {
      const mockUser = { id: 'uuid-1', email: 'test@test.com', name: 'Test', role: 'MANAGER' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await findUserById('uuid-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        select: expect.objectContaining({ password: undefined }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should include password when requested', async () => {
      const mockUser = { id: 'uuid-1', email: 'test@test.com', password: 'hashed' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await findUserById('uuid-1', true);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        select: expect.objectContaining({ password: true }),
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await findUserById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should normalize email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await findUserByEmail('TEST@EXAMPLE.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [{ id: 'uuid-1' }, { id: 'uuid-2' }];
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(2);

      const result = await listUsers({ page: 1, limit: 10 });

      expect(result).toEqual({ users: mockUsers, total: 2, page: 1, limit: 10 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it('should filter by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await listUsers({ role: 'ADMIN' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'ADMIN' } })
      );
    });
  });

  describe('createUser', () => {
    it('should normalize email on creation', async () => {
      const mockUser = { id: 'uuid-1', email: 'test@example.com' };
      prisma.user.create.mockResolvedValue(mockUser);

      await createUser({ email: 'TEST@EXAMPLE.COM', password: 'hashed', name: 'Test' });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@example.com' }),
        })
      );
    });
  });

  describe('deactivateUser', () => {
    it('should set isActive to false', async () => {
      const mockUser = { id: 'uuid-1', isActive: false };
      prisma.user.update.mockResolvedValue(mockUser);

      await deactivateUser('uuid-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: { isActive: false },
        })
      );
    });
  });
});

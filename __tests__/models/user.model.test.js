/**
 * User Model Tests
 * Tests for user model utility functions
 */

// Mock Prisma client
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { prisma } = require('../../src/config/database');
const {
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
} = require('../../src/models/user.model');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRole enum', () => {
    it('should have ADMIN and MANAGER roles', () => {
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.MANAGER).toBe('MANAGER');
    });
  });

  describe('findUserById', () => {
    it('should find user by ID without password', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await findUserById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: USER_SAFE_FIELDS,
      });
      expect(result).toEqual(mockUser);
    });

    it('should find user by ID with password when requested', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', password: 'hashed' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await findUserById('user-1', true);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: undefined,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await findUserById('non-existent');
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

  describe('createUser', () => {
    it('should create user with normalized email', async () => {
      const mockUser = { id: 'new-user', email: 'test@example.com' };
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await createUser({
        email: 'TEST@EXAMPLE.COM',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            role: UserRole.MANAGER,
            isActive: true,
          }),
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should use provided role', async () => {
      prisma.user.create.mockResolvedValue({});

      await createUser({
        email: 'admin@example.com',
        password: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.ADMIN }),
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should only update provided fields', async () => {
      prisma.user.update.mockResolvedValue({});

      await updateUser('user-1', { firstName: 'Updated' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Updated' },
        select: USER_SAFE_FIELDS,
      });
    });
  });

  describe('deactivateUser', () => {
    it('should set isActive to false', async () => {
      prisma.user.update.mockResolvedValue({});

      await deactivateUser('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
        select: USER_SAFE_FIELDS,
      });
    });
  });

  describe('listUsers', () => {
    it('should use default pagination', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await listUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      );
      expect(result).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    it('should apply search filter', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await listUsers({ search: 'john' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.objectContaining({ contains: 'john' }) }),
            ]),
          }),
        })
      );
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email exists', async () => {
      prisma.user.count.mockResolvedValue(1);

      const result = await isEmailTaken('existing@example.com');
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      prisma.user.count.mockResolvedValue(0);

      const result = await isEmailTaken('new@example.com');
      expect(result).toBe(false);
    });
  });

  describe('storeRefreshToken', () => {
    it('should create a refresh token record', async () => {
      const expiresAt = new Date();
      prisma.refreshToken.create.mockResolvedValue({});

      await storeRefreshToken('user-1', 'token-value', expiresAt);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', token: 'token-value', expiresAt },
      });
    });
  });

  describe('revokeRefreshToken', () => {
    it('should mark token as revoked', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await revokeRefreshToken('some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
        data: { isRevoked: true },
      });
    });
  });

  describe('cleanExpiredTokens', () => {
    it('should delete expired tokens and return count', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const count = await cleanExpiredTokens();
      expect(count).toBe(5);
    });
  });
});

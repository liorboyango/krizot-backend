/**
 * Tests for JWT Utility
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing';

const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../src/utils/jwt');

const testUser = { id: 'user-123', email: 'test@example.com', role: 'manager' };

describe('generateAccessToken', () => {
  it('should generate a valid JWT access token', () => {
    const token = generateAccessToken(testUser);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.email).toBe(testUser.email);
    expect(decoded.role).toBe(testUser.role);
    expect(decoded.type).toBe('access');
  });

  it('should expire in approximately 15 minutes', () => {
    const token = generateAccessToken(testUser);
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(15 * 60);
  });
});

describe('generateRefreshToken', () => {
  it('should generate a valid JWT refresh token', () => {
    const token = generateRefreshToken(testUser);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.type).toBe('refresh');
  });

  it('should expire in approximately 7 days', () => {
    const token = generateRefreshToken(testUser);
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(7 * 24 * 60 * 60);
  });
});

describe('verifyRefreshToken', () => {
  it('should verify a valid refresh token', () => {
    const token = generateRefreshToken(testUser);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.type).toBe('refresh');
  });

  it('should throw AppError for expired refresh token', () => {
    const token = jwt.sign(
      { id: 'user-1', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '-1s' }
    );
    expect(() => verifyRefreshToken(token)).toThrow(
      expect.objectContaining({ statusCode: 401, message: expect.stringContaining('expired') })
    );
  });

  it('should throw AppError for invalid token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('should throw AppError when access token is passed as refresh token', () => {
    const accessToken = generateAccessToken(testUser);
    // Access token is signed with JWT_SECRET, not JWT_REFRESH_SECRET
    expect(() => verifyRefreshToken(accessToken)).toThrow(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});

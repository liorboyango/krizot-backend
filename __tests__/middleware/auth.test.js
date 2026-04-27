/**
 * Tests for Authentication & Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../src/middleware/auth');
const { tokenBlacklist } = require('../../src/utils/tokenBlacklist');

// Set up test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeToken(payload = {}, secret = process.env.JWT_SECRET, options = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', role: 'manager', type: 'access', ...payload },
    secret,
    { expiresIn: '15m', ...options }
  );
}

function mockReq(overrides = {}) {
  return {
    headers: {},
    user: null,
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  beforeEach(() => {
    tokenBlacklist.clear();
  });

  it('should call next() with valid access token', async () => {
    const token = makeToken();
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      role: 'manager',
    });
  });

  it('should call next(AppError) when no token provided', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(req.user).toBeNull();
  });

  it('should call next(AppError) when token is malformed', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer not-a-valid-token' } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('should call next(AppError) when token is expired', async () => {
    const token = makeToken({}, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: expect.stringContaining('expired') })
    );
  });

  it('should call next(AppError) when token is blacklisted', async () => {
    const token = makeToken();
    tokenBlacklist.addToBlacklist(token);

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: expect.stringContaining('invalidated') })
    );
  });

  it('should reject refresh tokens used as access tokens', async () => {
    const token = jwt.sign(
      { id: 'user-1', email: 'test@example.com', type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: expect.stringContaining('token type') })
    );
  });

  it('should reject tokens signed with wrong secret', async () => {
    const token = makeToken({}, 'wrong-secret');
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

// ─── authorize ────────────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  it('should call next() when user has required role', () => {
    const req = mockReq({ user: { id: '1', email: 'admin@test.com', role: 'admin' } });
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() when user has one of multiple allowed roles', () => {
    const req = mockReq({ user: { id: '1', email: 'mgr@test.com', role: 'manager' } });
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'manager')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next(AppError 403) when user lacks required role', () => {
    const req = mockReq({ user: { id: '1', email: 'mgr@test.com', role: 'manager' } });
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('should call next(AppError 401) when req.user is not set', () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

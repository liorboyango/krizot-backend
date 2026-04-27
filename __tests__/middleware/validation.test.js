/**
 * Tests for Request Validation Middleware
 */

const { validate, schemas } = require('../../src/middleware/validation');

function mockReq(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validate middleware', () => {
  describe('login schema', () => {
    const middleware = validate({ body: schemas.login });

    it('should pass with valid email and password', () => {
      const req = mockReq({ body: { email: 'user@example.com', password: 'secret123' } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail with invalid email', () => {
      const req = mockReq({ body: { email: 'not-an-email', password: 'secret123' } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should fail with missing password', () => {
      const req = mockReq({ body: { email: 'user@example.com' } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should fail with password shorter than 6 chars', () => {
      const req = mockReq({ body: { email: 'user@example.com', password: '123' } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('createStation schema', () => {
    const middleware = validate({ body: schemas.createStation });

    it('should pass with valid station data', () => {
      const req = mockReq({
        body: { name: 'Alpha', location: 'North', capacity: 4 },
      });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail when capacity is 0', () => {
      const req = mockReq({
        body: { name: 'Alpha', location: 'North', capacity: 0 },
      });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should fail when name is missing', () => {
      const req = mockReq({ body: { location: 'North', capacity: 4 } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('pagination schema', () => {
    const middleware = validate({ query: schemas.pagination });

    it('should apply defaults when no query params provided', () => {
      const req = mockReq({ query: {} });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
    });

    it('should fail when limit exceeds 100', () => {
      const req = mockReq({ query: { limit: '200' } });
      const next = jest.fn();
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});

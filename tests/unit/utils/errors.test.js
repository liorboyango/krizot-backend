/**
 * Unit Tests — Custom Error Classes
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const {
  AppError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  InvalidTokenError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ScheduleConflictError,
  RateLimitError,
  InternalError,
} = require('../../../src/utils/errors');

describe('Custom Error Classes', () => {
  describe('AppError (base)', () => {
    it('sets all properties correctly', () => {
      const err = new AppError('Test error', 418, 'TEST_CODE', { field: 'value' });
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(418);
      expect(err.code).toBe('TEST_CODE');
      expect(err.details).toEqual({ field: 'value' });
      expect(err.isOperational).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('captures stack trace', () => {
      const err = new AppError('Stack test');
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('AppError');
    });
  });

  describe('ValidationError', () => {
    it('has correct status code and code', () => {
      const err = new ValidationError('Invalid input', [{ field: 'email', message: 'required' }]);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toHaveLength(1);
    });
  });

  describe('BadRequestError', () => {
    it('has status 400', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });
  });

  describe('UnauthorizedError', () => {
    it('has status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });
  });

  describe('InvalidTokenError', () => {
    it('has status 401', () => {
      const err = new InvalidTokenError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_TOKEN');
    });
  });

  describe('ForbiddenError', () => {
    it('has status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('has status 404 and includes resource name', () => {
      const err = new NotFoundError('Station');
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain('Station');
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('has status 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('ScheduleConflictError', () => {
    it('has status 409 with SCHEDULE_CONFLICT code', () => {
      const err = new ScheduleConflictError('Double booking', { userId: 'u1' });
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('SCHEDULE_CONFLICT');
      expect(err.details).toEqual({ userId: 'u1' });
    });
  });

  describe('RateLimitError', () => {
    it('has status 429', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('InternalError', () => {
    it('has status 500', () => {
      const err = new InternalError();
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });
  });
});

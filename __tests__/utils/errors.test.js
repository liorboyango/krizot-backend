/**
 * Error Classes Tests
 */

const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BusinessError,
} = require('../../src/utils/errors');

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const err = new AppError('Test error', 500, 'TEST_CODE', { detail: 'info' });

      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('TEST_CODE');
      expect(err.details).toEqual({ detail: 'info' });
      expect(err.isOperational).toBe(true);
      expect(err instanceof Error).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should have 400 status code', () => {
      const err = new ValidationError('Invalid input');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AuthenticationError', () => {
    it('should have 401 status code', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('AuthorizationError', () => {
    it('should have 403 status code', () => {
      const err = new AuthorizationError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code with resource name', () => {
      const err = new NotFoundError('User');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status code', () => {
      const err = new ConflictError('Email already taken');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('RateLimitError', () => {
    it('should have 429 status code', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('BusinessError', () => {
    it('should have 422 status code', () => {
      const err = new BusinessError('Scheduling conflict detected');
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('BUSINESS_ERROR');
    });
  });
});

/**
 * Error Utility Tests
 */

'use strict';

const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} = require('../../src/utils/errors');

describe('AppError', () => {
  it('should create an error with default values', () => {
    const err = new AppError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('should create an error with custom status and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
  });
});

describe('ValidationError', () => {
  it('should have 400 status code', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
  });
});

describe('AuthenticationError', () => {
  it('should have 401 status code', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('UNAUTHORIZED');
  });
});

describe('AuthorizationError', () => {
  it('should have 403 status code', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.errorCode).toBe('FORBIDDEN');
  });
});

describe('NotFoundError', () => {
  it('should have 404 status code', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });
});

describe('ConflictError', () => {
  it('should have 409 status code', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.errorCode).toBe('CONFLICT');
  });
});

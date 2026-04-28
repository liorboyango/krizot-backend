/**
 * Unit Tests — User Validation Schemas
 */

'use strict';

// Set required env vars before loading any module that imports config/env
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const {
  loginSchema,
  registerSchema,
  updateUserSchema,
  listUsersQuerySchema,
} = require('../../../src/validation/schemas/userSchemas');

describe('User Validation Schemas', () => {
  // ── loginSchema ────────────────────────────────────────────────────────────
  describe('loginSchema', () => {
    it('accepts a valid idToken', () => {
      const { error } = loginSchema.validate({ idToken: 'eyJhbGciOi...' });
      expect(error).toBeUndefined();
    });

    it('rejects missing idToken', () => {
      const { error } = loginSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('idToken');
    });

    it('rejects non-string idToken', () => {
      const { error } = loginSchema.validate({ idToken: 12345 });
      expect(error).toBeDefined();
    });
  });

  // ── registerSchema ─────────────────────────────────────────────────────────
  describe('registerSchema', () => {
    const valid = {
      email: 'user@krizot.com',
      password: 'SecurePass1',
      name: 'John Doe',
    };

    it('accepts valid registration data', () => {
      const { error } = registerSchema.validate(valid);
      expect(error).toBeUndefined();
    });

    it('defaults role to manager', () => {
      const { value } = registerSchema.validate(valid);
      expect(value.role).toBe('manager');
    });

    it('accepts admin role', () => {
      const { error } = registerSchema.validate({ ...valid, role: 'admin' });
      expect(error).toBeUndefined();
    });

    it('rejects invalid role', () => {
      const { error } = registerSchema.validate({ ...valid, role: 'superuser' });
      expect(error).toBeDefined();
    });

    it('rejects password without uppercase', () => {
      const { error } = registerSchema.validate({ ...valid, password: 'alllowercase1' });
      expect(error).toBeDefined();
    });

    it('rejects password without number', () => {
      const { error } = registerSchema.validate({ ...valid, password: 'NoNumberHere' });
      expect(error).toBeDefined();
    });
  });

  // ── updateUserSchema ───────────────────────────────────────────────────────
  describe('updateUserSchema', () => {
    it('accepts partial update', () => {
      const { error } = updateUserSchema.validate({ name: 'New Name' });
      expect(error).toBeUndefined();
    });

    it('rejects empty object', () => {
      const { error } = updateUserSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ── listUsersQuerySchema ───────────────────────────────────────────────────
  describe('listUsersQuerySchema', () => {
    it('applies defaults', () => {
      const { value } = listUsersQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('rejects page < 1', () => {
      const { error } = listUsersQuerySchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it('rejects limit > 100', () => {
      const { error } = listUsersQuerySchema.validate({ limit: 200 });
      expect(error).toBeDefined();
    });
  });
});

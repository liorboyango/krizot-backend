/**
 * Unit Tests — Station Validation Schemas
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const {
  createStationSchema,
  updateStationSchema,
  listStationsQuerySchema,
} = require('../../../src/validation/schemas/stationSchemas');

describe('Station Validation Schemas', () => {
  // ── createStationSchema ────────────────────────────────────────────────────
  describe('createStationSchema', () => {
    const valid = {
      name: 'Alpha Station',
      location: 'North Sector',
      capacity: 4,
    };

    it('accepts valid station data', () => {
      const { error } = createStationSchema.validate(valid);
      expect(error).toBeUndefined();
    });

    it('defaults status to active', () => {
      const { value } = createStationSchema.validate(valid);
      expect(value.status).toBe('active');
    });

    it('rejects missing name', () => {
      const { error } = createStationSchema.validate({ location: 'North', capacity: 2 });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('rejects capacity < 1', () => {
      const { error } = createStationSchema.validate({ ...valid, capacity: 0 });
      expect(error).toBeDefined();
    });

    it('rejects capacity > 100', () => {
      const { error } = createStationSchema.validate({ ...valid, capacity: 101 });
      expect(error).toBeDefined();
    });

    it('rejects invalid status', () => {
      const { error } = createStationSchema.validate({ ...valid, status: 'unknown' });
      expect(error).toBeDefined();
    });

    it('accepts valid status values', () => {
      for (const status of ['active', 'closed', 'maintenance']) {
        const { error } = createStationSchema.validate({ ...valid, status });
        expect(error).toBeUndefined();
      }
    });

    it('strips unknown fields', () => {
      const { value } = createStationSchema.validate(
        { ...valid, unknownField: 'should be removed' },
        { stripUnknown: true },
      );
      expect(value.unknownField).toBeUndefined();
    });
  });

  // ── updateStationSchema ────────────────────────────────────────────────────
  describe('updateStationSchema', () => {
    it('accepts partial update', () => {
      const { error } = updateStationSchema.validate({ capacity: 6 });
      expect(error).toBeUndefined();
    });

    it('rejects empty object', () => {
      const { error } = updateStationSchema.validate({});
      expect(error).toBeDefined();
    });

    it('accepts notes as empty string', () => {
      const { error } = updateStationSchema.validate({ notes: '' });
      expect(error).toBeUndefined();
    });
  });

  // ── listStationsQuerySchema ────────────────────────────────────────────────
  describe('listStationsQuerySchema', () => {
    it('applies defaults', () => {
      const { value } = listStationsQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.sortBy).toBe('createdAt');
      expect(value.sortOrder).toBe('desc');
    });

    it('accepts valid sort fields', () => {
      for (const sortBy of ['name', 'location', 'capacity', 'createdAt']) {
        const { error } = listStationsQuerySchema.validate({ sortBy });
        expect(error).toBeUndefined();
      }
    });

    it('rejects invalid sort field', () => {
      const { error } = listStationsQuerySchema.validate({ sortBy: 'invalid' });
      expect(error).toBeDefined();
    });
  });
});

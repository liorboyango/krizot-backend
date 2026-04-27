/**
 * Unit Tests — Schedule Validation Schemas
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const {
  createScheduleSchema,
  updateScheduleSchema,
  bulkAssignSchema,
  listSchedulesQuerySchema,
} = require('../../../src/validation/schemas/scheduleSchemas');

describe('Schedule Validation Schemas', () => {
  const validSchedule = {
    stationId: 'station-123',
    userId: 'user-456',
    startTime: '2026-04-27T07:00:00.000Z',
    endTime: '2026-04-27T15:00:00.000Z',
  };

  // ── createScheduleSchema ───────────────────────────────────────────────────
  describe('createScheduleSchema', () => {
    it('accepts valid schedule data', () => {
      const { error } = createScheduleSchema.validate(validSchedule);
      expect(error).toBeUndefined();
    });

    it('rejects endTime before startTime', () => {
      const { error } = createScheduleSchema.validate({
        ...validSchedule,
        startTime: '2026-04-27T15:00:00.000Z',
        endTime: '2026-04-27T07:00:00.000Z',
      });
      expect(error).toBeDefined();
    });

    it('rejects endTime equal to startTime', () => {
      const { error } = createScheduleSchema.validate({
        ...validSchedule,
        startTime: '2026-04-27T07:00:00.000Z',
        endTime: '2026-04-27T07:00:00.000Z',
      });
      expect(error).toBeDefined();
    });

    it('rejects shift longer than 24 hours', () => {
      const { error } = createScheduleSchema.validate({
        ...validSchedule,
        startTime: '2026-04-27T00:00:00.000Z',
        endTime: '2026-04-28T01:00:00.000Z',
      });
      expect(error).toBeDefined();
    });

    it('rejects invalid ISO date', () => {
      const { error } = createScheduleSchema.validate({
        ...validSchedule,
        startTime: 'not-a-date',
      });
      expect(error).toBeDefined();
    });

    it('rejects missing stationId', () => {
      const { stationId, ...rest } = validSchedule;
      const { error } = createScheduleSchema.validate(rest);
      expect(error).toBeDefined();
    });
  });

  // ── updateScheduleSchema ───────────────────────────────────────────────────
  describe('updateScheduleSchema', () => {
    it('accepts partial update', () => {
      const { error } = updateScheduleSchema.validate({ notes: 'Updated notes' });
      expect(error).toBeUndefined();
    });

    it('rejects empty object', () => {
      const { error } = updateScheduleSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ── bulkAssignSchema ───────────────────────────────────────────────────────
  describe('bulkAssignSchema', () => {
    it('accepts valid bulk assignments', () => {
      const { error } = bulkAssignSchema.validate({
        assignments: [validSchedule, { ...validSchedule, stationId: 'station-789' }],
      });
      expect(error).toBeUndefined();
    });

    it('rejects empty assignments array', () => {
      const { error } = bulkAssignSchema.validate({ assignments: [] });
      expect(error).toBeDefined();
    });

    it('rejects more than 50 assignments', () => {
      const assignments = Array.from({ length: 51 }, (_, i) => ({
        ...validSchedule,
        stationId: `station-${i}`,
      }));
      const { error } = bulkAssignSchema.validate({ assignments });
      expect(error).toBeDefined();
    });

    it('rejects missing assignments field', () => {
      const { error } = bulkAssignSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  // ── listSchedulesQuerySchema ───────────────────────────────────────────────
  describe('listSchedulesQuerySchema', () => {
    it('applies defaults', () => {
      const { value } = listSchedulesQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.sortBy).toBe('startTime');
      expect(value.sortOrder).toBe('asc');
    });
  });
});

/**
 * Unit Tests — Response Helpers
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const { sendSuccess, sendCreated, sendPaginated, buildPagination } = require('../../../src/utils/response');

// Mock Express response object
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Response Helpers', () => {
  describe('sendSuccess', () => {
    it('sends 200 with correct envelope', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'OK',
        data: { id: 1 },
      });
    });

    it('includes meta when provided', () => {
      const res = mockRes();
      sendSuccess(res, [], 'List', 200, { pagination: { page: 1 } });
      const call = res.json.mock.calls[0][0];
      expect(call.meta).toBeDefined();
      expect(call.meta.pagination.page).toBe(1);
    });
  });

  describe('sendCreated', () => {
    it('sends 201 status', () => {
      const res = mockRes();
      sendCreated(res, { id: 'new-id' });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendPaginated', () => {
    it('includes pagination in meta', () => {
      const res = mockRes();
      const pagination = buildPagination(1, 10, 25);
      sendPaginated(res, [1, 2, 3], pagination);
      const call = res.json.mock.calls[0][0];
      expect(call.meta.pagination.total).toBe(25);
      expect(call.meta.pagination.totalPages).toBe(3);
      expect(call.meta.pagination.hasNextPage).toBe(true);
      expect(call.meta.pagination.hasPrevPage).toBe(false);
    });
  });

  describe('buildPagination', () => {
    it('calculates totalPages correctly', () => {
      expect(buildPagination(1, 10, 25).totalPages).toBe(3);
      expect(buildPagination(1, 10, 10).totalPages).toBe(1);
      expect(buildPagination(1, 10, 0).totalPages).toBe(0);
    });

    it('sets hasNextPage and hasPrevPage correctly', () => {
      const p1 = buildPagination(1, 10, 25);
      expect(p1.hasNextPage).toBe(true);
      expect(p1.hasPrevPage).toBe(false);

      const p3 = buildPagination(3, 10, 25);
      expect(p3.hasNextPage).toBe(false);
      expect(p3.hasPrevPage).toBe(true);
    });
  });
});

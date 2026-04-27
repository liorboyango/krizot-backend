/**
 * Response Utility Tests
 */

const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../../src/utils/response');

describe('Response Utilities', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    it('should send 200 with success structure', () => {
      sendSuccess(mockRes, { id: 1 }, 'Done');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Done',
        data: { id: 1 },
      });
    });
  });

  describe('sendCreated', () => {
    it('should send 201 status', () => {
      sendCreated(mockRes, { id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('sendPaginated', () => {
    it('should include pagination metadata', () => {
      sendPaginated(mockRes, [{ id: 1 }], {
        total: 100,
        page: 2,
        limit: 20,
        totalPages: 5,
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ id: 1 }],
          pagination: expect.objectContaining({
            total: 100,
            page: 2,
            hasNext: true,
            hasPrev: true,
          }),
        })
      );
    });
  });

  describe('sendError', () => {
    it('should send error with correct structure', () => {
      sendError(mockRes, 'Something went wrong', 500, 'INTERNAL_ERROR');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      });
    });

    it('should include details when provided', () => {
      sendError(mockRes, 'Validation failed', 400, 'VALIDATION_ERROR', { field: 'email' });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'email' },
          }),
        })
      );
    });
  });
});

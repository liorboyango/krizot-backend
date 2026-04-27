/**
 * Response Utility Tests
 */

'use strict';

const { sendSuccess, sendPaginated, sendCreated, sendNoContent } = require('../../src/utils/response');

// Mock Express response object
function mockRes() {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
    send() {
      return this;
    },
    set(key, value) {
      this._headers[key] = value;
      return this;
    },
  };
  return res;
}

describe('sendSuccess', () => {
  it('should send 200 with success body', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'OK');
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.data).toEqual({ id: 1 });
    expect(res._body.message).toBe('OK');
  });
});

describe('sendCreated', () => {
  it('should send 201 with created body', () => {
    const res = mockRes();
    sendCreated(res, { id: 2 });
    expect(res._status).toBe(201);
    expect(res._body.success).toBe(true);
  });
});

describe('sendPaginated', () => {
  it('should send paginated response with headers', () => {
    const res = mockRes();
    sendPaginated(res, [{ id: 1 }], { total: 50, page: 1, perPage: 20 });
    expect(res._status).toBe(200);
    expect(res._body.pagination.total).toBe(50);
    expect(res._body.pagination.totalPages).toBe(3);
    expect(res._body.pagination.hasNextPage).toBe(true);
    expect(res._headers['X-Total-Count']).toBe('50');
  });
});

describe('sendNoContent', () => {
  it('should send 204 with no body', () => {
    const res = mockRes();
    sendNoContent(res);
    expect(res._status).toBe(204);
  });
});

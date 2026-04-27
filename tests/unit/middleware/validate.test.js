/**
 * Unit Tests — Validation Middleware
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const Joi = require('joi');
const { validate, validateRequest } = require('../../../src/middleware/validate');
const { ValidationError } = require('../../../src/utils/errors');

// Mock Express req/res/next
const mockReq = (body = {}, query = {}, params = {}) => ({ body, query, params });
const mockNext = () => jest.fn();

describe('Validation Middleware', () => {
  describe('validate()', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0),
    });

    it('calls next() with no error on valid input', () => {
      const req = mockReq({ name: 'Alice', age: 30 });
      const next = mockNext();
      validate(schema)(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('calls next(ValidationError) on invalid input', () => {
      const req = mockReq({ age: 30 }); // missing name
      const next = mockNext();
      validate(schema)(req, {}, next);
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('strips unknown fields from req.body', () => {
      const req = mockReq({ name: 'Bob', unknownField: 'x' });
      const next = mockNext();
      validate(schema)(req, {}, next);
      expect(req.body.unknownField).toBeUndefined();
    });

    it('validates query params when source=query', () => {
      const req = mockReq({}, { name: 'Alice' });
      const next = mockNext();
      validate(schema, 'query')(req, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('collects all errors (abortEarly: false)', () => {
      const multiSchema = Joi.object({
        a: Joi.string().required(),
        b: Joi.number().required(),
      });
      const req = mockReq({});
      const next = mockNext();
      validate(multiSchema)(req, {}, next);
      const err = next.mock.calls[0][0];
      expect(err.details).toHaveLength(2);
    });
  });

  describe('validateRequest()', () => {
    const bodySchema = Joi.object({ name: Joi.string().required() });
    const querySchema = Joi.object({ page: Joi.number().default(1) });

    it('validates multiple sources', () => {
      const req = mockReq({ name: 'Alice' }, {});
      const next = mockNext();
      validateRequest({ body: bodySchema, query: querySchema })(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1); // default applied
    });

    it('aggregates errors from multiple sources', () => {
      const req = mockReq({}, { page: -1 }); // missing body.name, invalid query.page
      const next = mockNext();
      validateRequest({ body: bodySchema, query: querySchema })(req, {}, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.details.length).toBeGreaterThanOrEqual(2);
    });
  });
});

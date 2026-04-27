/**
 * Unit Tests — Sanitization Middleware
 */

'use strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';

const { sanitizeValue, sanitizeObject, sanitizeRequest } = require('../../../src/middleware/sanitize');

describe('Sanitization Middleware', () => {
  describe('sanitizeValue()', () => {
    it('trims whitespace from strings', () => {
      expect(sanitizeValue('  hello  ')).toBe('hello');
    });

    it('removes <script> tags', () => {
      const result = sanitizeValue('<script>alert(1)</script>hello');
      expect(result).not.toContain('<script>');
      expect(result).toContain('hello');
    });

    it('removes javascript: protocol', () => {
      const result = sanitizeValue('javascript:alert(1)');
      expect(result).not.toContain('javascript:');
    });

    it('removes inline event handlers', () => {
      const result = sanitizeValue('<img onclick=alert(1)>');
      expect(result).not.toMatch(/onclick\s*=/);
    });

    it('passes through safe strings unchanged (after trim)', () => {
      expect(sanitizeValue('Hello World')).toBe('Hello World');
    });

    it('handles numbers unchanged', () => {
      expect(sanitizeValue(42)).toBe(42);
    });

    it('handles null unchanged', () => {
      expect(sanitizeValue(null)).toBeNull();
    });

    it('recursively sanitizes arrays', () => {
      const result = sanitizeValue(['<script>x</script>', 'safe']);
      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toBe('safe');
    });
  });

  describe('sanitizeObject()', () => {
    it('sanitizes all string values in an object', () => {
      const result = sanitizeObject({
        name: '  Alice  ',
        bio: '<script>bad</script>',
        age: 30,
      });
      expect(result.name).toBe('Alice');
      expect(result.bio).not.toContain('<script>');
      expect(result.age).toBe(30);
    });

    it('handles nested objects', () => {
      const result = sanitizeObject({
        user: { name: '<b>Bob</b>' },
      });
      // <b> is not in dangerous patterns, should pass through
      expect(result.user.name).toBe('<b>Bob</b>');
    });
  });

  describe('sanitizeRequest middleware', () => {
    it('sanitizes req.body, req.query, req.params', () => {
      const req = {
        body: { name: '  Alice  ', xss: '<script>x</script>' },
        query: { search: '  term  ' },
        params: { id: '  123  ' },
      };
      const next = jest.fn();
      sanitizeRequest(req, {}, next);
      expect(req.body.name).toBe('Alice');
      expect(req.body.xss).not.toContain('<script>');
      expect(req.query.search).toBe('term');
      expect(req.params.id).toBe('123');
      expect(next).toHaveBeenCalled();
    });

    it('calls next() even if body is missing', () => {
      const req = { query: {}, params: {} };
      const next = jest.fn();
      sanitizeRequest(req, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

/**
 * Server Integration Tests
 * Tests for server startup, health check, and basic middleware
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/krizot_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

const request = require('supertest');

// Mock Prisma to avoid real DB connection in unit tests
jest.mock('../src/config/database', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const app = require('../src/index');

describe('Server', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('message');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      expect(res.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('API Routes', () => {
    it('should return 501 for unimplemented auth login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
      expect(res.status).toBe(501);
    });

    it('should return 501 for unimplemented stations list', async () => {
      const res = await request(app).get('/api/stations');
      expect(res.status).toBe(501);
    });

    it('should return 501 for unimplemented schedules list', async () => {
      const res = await request(app).get('/api/schedules');
      expect(res.status).toBe(501);
    });
  });
});

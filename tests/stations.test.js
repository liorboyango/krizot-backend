/**
 * Stations API Integration Tests
 * Tests all CRUD endpoints for station management.
 *
 * Run with: npm test
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock Prisma before importing app
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    station: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    schedule: {
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

const { PrismaClient } = require('@prisma/client');
const mockPrisma = new PrismaClient();

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';

const app = require('../src/index');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a test JWT token.
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-123', email: 'test@example.com', role: 'admin', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const adminToken = generateToken({ role: 'admin' });
const managerToken = generateToken({ role: 'manager' });
const staffToken = generateToken({ role: 'staff' });

/** Sample station data */
const sampleStation = {
  id: 'station-uuid-001',
  name: 'Alpha Station',
  location: 'North Sector',
  capacity: 4,
  status: 'active',
  notes: 'Main northern checkpoint',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  _count: { schedules: 2 },
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Stations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/stations ────────────────────────────────────────────────────────

  describe('GET /api/stations', () => {
    it('should return paginated list of stations', async () => {
      mockPrisma.station.findMany.mockResolvedValue([sampleStation]);
      mockPrisma.station.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alpha Station');
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should support search query parameter', async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);
      mockPrisma.station.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/stations?search=Alpha')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support status filter', async () => {
      mockPrisma.station.findMany.mockResolvedValue([sampleStation]);
      mockPrisma.station.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/stations?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid status filter', async () => {
      const res = await request(app)
        .get('/api/stations?status=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should support pagination parameters', async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);
      mockPrisma.station.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/stations?page=2&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  // ── GET /api/stations/stats ──────────────────────────────────────────────────

  describe('GET /api/stations/stats', () => {
    it('should return station statistics', async () => {
      mockPrisma.station.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8)   // active
        .mockResolvedValueOnce(2);  // closed
      mockPrisma.station.aggregate.mockResolvedValue({ _sum: { capacity: 40 } });

      const res = await request(app)
        .get('/api/stations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.active).toBe(8);
      expect(res.body.data.closed).toBe(2);
      expect(res.body.data.totalCapacity).toBe(40);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stations/stats');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/stations/:id ────────────────────────────────────────────────────

  describe('GET /api/stations/:id', () => {
    it('should return a single station by ID', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        ...sampleStation,
        schedules: [],
      });

      const res = await request(app)
        .get(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleStation.id);
      expect(res.body.data.name).toBe('Alpha Station');
      expect(res.body.data.schedules).toBeDefined();
    });

    it('should return 404 for non-existent station', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/stations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`/api/stations/${sampleStation.id}`);
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/stations ───────────────────────────────────────────────────────

  describe('POST /api/stations', () => {
    const validPayload = {
      name: 'Beta Station',
      location: 'South Sector',
      capacity: 3,
      status: 'active',
      notes: 'Southern checkpoint',
    };

    it('should create a new station (admin)', async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.create.mockResolvedValue({
        ...sampleStation,
        id: 'new-station-id',
        name: 'Beta Station',
        location: 'South Sector',
        capacity: 3,
      });

      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Station created successfully');
      expect(res.body.data).toBeDefined();
    });

    it('should create a new station (manager)', async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.create.mockResolvedValue({
        ...sampleStation,
        name: 'Beta Station',
      });

      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
    });

    it('should return 403 for staff role', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Only Name' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    it('should return 400 for invalid capacity (too high)', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, capacity: 25 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid capacity (zero)', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, capacity: 0 });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate station name', async () => {
      mockPrisma.station.findFirst.mockResolvedValue(sampleStation);

      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, name: 'Alpha Station' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, status: 'unknown' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/stations')
        .send(validPayload);

      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/stations/:id ────────────────────────────────────────────────────

  describe('PUT /api/stations/:id', () => {
    it('should update a station (admin)', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(sampleStation);
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.update.mockResolvedValue({
        ...sampleStation,
        name: 'Alpha Station Updated',
        capacity: 6,
      });

      const res = await request(app)
        .put(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Alpha Station Updated', capacity: 6 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Station updated successfully');
    });

    it('should update a station (manager)', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(sampleStation);
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.update.mockResolvedValue({
        ...sampleStation,
        status: 'closed',
      });

      const res = await request(app)
        .put(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for staff role', async () => {
      const res = await request(app)
        .put(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent station', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/stations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for empty update body', async () => {
      const res = await request(app)
        .put(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate name on update', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(sampleStation);
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'other-id', name: 'Beta Station' });

      const res = await request(app)
        .put(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Beta Station' });

      expect(res.status).toBe(409);
    });
  });

  // ── DELETE /api/stations/:id ─────────────────────────────────────────────────

  describe('DELETE /api/stations/:id', () => {
    it('should delete a station (admin)', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        ...sampleStation,
        _count: { schedules: 0 },
      });
      mockPrisma.station.delete.mockResolvedValue(sampleStation);

      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleStation.id);
    });

    it('should return 403 for manager role (admin only)', async () => {
      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 for staff role', async () => {
      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent station', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/stations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 409 when station has active schedules (no force)', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        ...sampleStation,
        _count: { schedules: 3 },
      });
      mockPrisma.schedule.count.mockResolvedValue(3);

      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should force delete station with active schedules when force=true', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        ...sampleStation,
        _count: { schedules: 3 },
      });
      mockPrisma.station.delete.mockResolvedValue(sampleStation);

      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}?force=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete(`/api/stations/${sampleStation.id}`);

      expect(res.status).toBe(401);
    });
  });
});

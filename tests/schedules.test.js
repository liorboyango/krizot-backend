/**
 * Schedule API Integration Tests
 * Tests for shift scheduling and assignment endpoints.
 */

const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/config/prisma');
const jwt = require('jsonwebtoken');

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

const adminToken = generateToken({ id: 'admin-user-id', email: 'admin@test.com', role: 'admin' });
const managerToken = generateToken({ id: 'manager-user-id', email: 'manager@test.com', role: 'manager' });
const staffToken = generateToken({ id: 'staff-user-id', email: 'staff@test.com', role: 'staff' });

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('../src/config/prisma', () => ({
  schedule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  station: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockStation = {
  id: 'station-uuid-1',
  name: 'Alpha Station',
  location: 'North',
  capacity: 4,
  status: 'ACTIVE',
};

const mockUser = {
  id: 'user-uuid-1',
  email: 'john@test.com',
  name: 'John Cohen',
  role: 'staff',
};

const mockSchedule = {
  id: 'schedule-uuid-1',
  stationId: 'station-uuid-1',
  userId: 'user-uuid-1',
  startTime: new Date('2026-04-28T07:00:00Z'),
  endTime: new Date('2026-04-28T15:00:00Z'),
  notes: null,
  station: { id: 'station-uuid-1', name: 'Alpha Station', location: 'North' },
  user: { id: 'user-uuid-1', email: 'john@test.com', name: 'John Cohen', role: 'staff' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Schedule API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/schedules ──────────────────────────────────────────────────────

  describe('GET /api/schedules', () => {
    it('should return paginated schedules for authenticated users', async () => {
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.schedule.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/schedules');
      expect(res.status).toBe(401);
    });

    it('should filter by stationId', async () => {
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.schedule.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/schedules?stationId=station-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stationId: 'station-uuid-1' }),
        })
      );
    });
  });

  // ── GET /api/schedules/stats ────────────────────────────────────────────────

  describe('GET /api/schedules/stats', () => {
    it('should return dashboard statistics', async () => {
      prisma.station.count.mockResolvedValueOnce(5).mockResolvedValueOnce(4);
      prisma.schedule.findMany.mockResolvedValue([
        { ...mockSchedule, userId: 'user-1', station: { status: 'ACTIVE' } },
        { ...mockSchedule, id: 'sched-2', userId: null, station: { status: 'ACTIVE' } },
      ]);

      const res = await request(app)
        .get('/api/schedules/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalStations');
      expect(res.body.data).toHaveProperty('onDuty');
      expect(res.body.data).toHaveProperty('openShifts');
      expect(res.body.data).toHaveProperty('criticalShifts');
    });
  });

  // ── GET /api/schedules/:id ──────────────────────────────────────────────────

  describe('GET /api/schedules/:id', () => {
    it('should return a schedule by ID', async () => {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .get('/api/schedules/schedule-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('schedule-uuid-1');
    });

    it('should return 404 for non-existent schedule', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/schedules/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/schedules ─────────────────────────────────────────────────────

  describe('POST /api/schedules', () => {
    const validPayload = {
      stationId: 'station-uuid-1',
      userId: 'user-uuid-1',
      startTime: '2026-04-28T07:00:00Z',
      endTime: '2026-04-28T15:00:00Z',
    };

    it('should create a schedule for admin/manager', async () => {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.schedule.count.mockResolvedValue(0); // No overlaps
      prisma.schedule.findFirst.mockResolvedValue(null); // No user conflict
      prisma.schedule.create.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('schedule-uuid-1');
    });

    it('should return 403 for staff role', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stationId: 'station-uuid-1' }); // Missing startTime, endTime

      expect(res.status).toBe(400);
    });

    it('should return 409 when station is at capacity', async () => {
      prisma.station.findUnique.mockResolvedValue({ ...mockStation, capacity: 1 });
      prisma.schedule.count.mockResolvedValue(1); // Already at capacity

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(409);
    });

    it('should return 409 when user has conflicting shift', async () => {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.schedule.findFirst.mockResolvedValue(mockSchedule); // Conflict!

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(409);
    });
  });

  // ── POST /api/schedules/assign ──────────────────────────────────────────────

  describe('POST /api/schedules/assign', () => {
    it('should bulk assign users to existing schedules', async () => {
      const openSchedule = { ...mockSchedule, userId: null };
      prisma.schedule.findUnique.mockResolvedValue(openSchedule);
      prisma.schedule.findFirst.mockResolvedValue(null); // No conflict
      prisma.schedule.update.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          assignments: [
            { scheduleId: 'schedule-uuid-1', userId: 'user-uuid-1' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.succeeded).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(0);
    });

    it('should return 207 when some assignments fail', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null); // Schedule not found

      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignments: [
            { scheduleId: 'non-existent-id', userId: 'user-uuid-1' },
          ],
        });

      expect(res.status).toBe(207);
      expect(res.body.data.failed).toHaveLength(1);
    });

    it('should return 400 for empty assignments array', async () => {
      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignments: [] });

      expect(res.status).toBe(400);
    });

    it('should return 403 for staff role', async () => {
      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ assignments: [{ scheduleId: 'id', userId: 'uid' }] });

      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/schedules/:id ──────────────────────────────────────────────────

  describe('PUT /api/schedules/:id', () => {
    it('should update a schedule', async () => {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.schedule.update.mockResolvedValue({
        ...mockSchedule,
        notes: 'Updated notes',
      });

      const res = await request(app)
        .put('/api/schedules/schedule-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent schedule', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/schedules/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'test' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/schedules/:id ───────────────────────────────────────────────

  describe('DELETE /api/schedules/:id', () => {
    it('should delete a schedule (admin only)', async () => {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.schedule.delete.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .delete('/api/schedules/schedule-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for manager role', async () => {
      const res = await request(app)
        .delete('/api/schedules/schedule-uuid-1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/schedules/:id/unassign ────────────────────────────────────────

  describe('POST /api/schedules/:id/unassign', () => {
    it('should unassign a user from a schedule', async () => {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.schedule.update.mockResolvedValue({ ...mockSchedule, userId: null, user: null });

      const res = await request(app)
        .post('/api/schedules/schedule-uuid-1/unassign')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── GET /api/schedules/week ─────────────────────────────────────────────────

  describe('GET /api/schedules/week', () => {
    it('should return weekly schedule grid', async () => {
      prisma.station.findMany.mockResolvedValue([mockStation]);
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);

      const res = await request(app)
        .get('/api/schedules/week?weekStart=2026-04-27')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('weekStart');
      expect(res.body.data).toHaveProperty('days');
      expect(res.body.data).toHaveProperty('grid');
      expect(res.body.data.days).toHaveLength(7);
    });
  });
});

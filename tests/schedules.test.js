/**
 * Schedules API Tests
 * Integration tests for shift scheduling and assignment endpoints.
 */

const request = require('supertest');

// Mock Prisma client BEFORE requiring app
jest.mock('../src/config/prismaClient', () => ({
  schedule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
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

// Mock JWT auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticate: function (req, res, next) {
    req.user = { id: 'user-uuid-1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    next();
  },
  requireRole: function (roles) {
    return function (req, res, next) {
      if (roles.includes(req.user.role)) return next();
      return res.status(403).json({ success: false, message: 'Forbidden' });
    };
  },
}));

const app = require('../src/index');
const prisma = require('../src/config/prismaClient');

const mockSchedule = {
  id: 'sched-uuid-1',
  stationId: 'station-uuid-1',
  userId: 'user-uuid-1',
  startTime: new Date('2024-04-27T07:00:00Z'),
  endTime: new Date('2024-04-27T15:00:00Z'),
  notes: 'Morning shift',
  station: { id: 'station-uuid-1', name: 'Alpha', location: 'North' },
  user: { id: 'user-uuid-1', email: 'admin@test.com', name: 'Admin' },
};

const mockStation = {
  id: 'station-uuid-1',
  name: 'Alpha',
  location: 'North',
  capacity: 4,
  status: 'ACTIVE',
};

describe('Schedules API', function () {
  beforeEach(function () {
    jest.clearAllMocks();
  });

  // ─── GET /api/schedules ───────────────────────────────────────────────────

  describe('GET /api/schedules', function () {
    it('should return paginated list of schedules', async function () {
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.schedule.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/schedules')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should filter by stationId', async function () {
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.schedule.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/schedules?stationId=station-uuid-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stationId: 'station-uuid-1' }),
        })
      );
    });
  });

  // ─── GET /api/schedules/:id ───────────────────────────────────────────────

  describe('GET /api/schedules/:id', function () {
    it('should return a schedule by ID', async function () {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .get('/api/schedules/sched-uuid-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('sched-uuid-1');
    });

    it('should return 404 for non-existent schedule', async function () {
      prisma.schedule.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/schedules/non-existent')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/schedules ──────────────────────────────────────────────────

  describe('POST /api/schedules', function () {
    it('should create a new schedule', async function () {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-1' });
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.schedule.create.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send({
          stationId: 'station-uuid-1',
          userId: 'user-uuid-1',
          startTime: '2024-04-27T07:00:00Z',
          endTime: '2024-04-27T15:00:00Z',
          notes: 'Morning shift',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 400 for missing required fields', async function () {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send({ stationId: 'station-uuid-1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });

    it('should return 409 when user has conflicting schedule', async function () {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-1' });
      // User conflict: findMany returns existing overlapping schedule
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.schedule.count.mockResolvedValue(0);

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send({
          stationId: 'station-uuid-1',
          userId: 'user-uuid-1',
          startTime: '2024-04-27T08:00:00Z',
          endTime: '2024-04-27T16:00:00Z',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.conflicts).toBeDefined();
    });
  });

  // ─── PUT /api/schedules/:id ───────────────────────────────────────────────

  describe('PUT /api/schedules/:id', function () {
    it('should update an existing schedule', async function () {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.schedule.update.mockResolvedValue(
        Object.assign({}, mockSchedule, { notes: 'Updated notes' })
      );

      const res = await request(app)
        .put('/api/schedules/sched-uuid-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent schedule', async function () {
      prisma.schedule.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/schedules/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .send({ notes: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/schedules/:id ────────────────────────────────────────────

  describe('DELETE /api/schedules/:id', function () {
    it('should delete a schedule', async function () {
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.schedule.delete.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .delete('/api/schedules/sched-uuid-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent schedule', async function () {
      prisma.schedule.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/schedules/non-existent')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/schedules/assign ───────────────────────────────────────────

  describe('POST /api/schedules/assign', function () {
    it('should bulk assign shifts successfully', async function () {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-1' });
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.schedule.create.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', 'Bearer valid-token')
        .send({
          assignments: [
            {
              stationId: 'station-uuid-1',
              userId: 'user-uuid-1',
              startTime: '2024-04-28T07:00:00Z',
              endTime: '2024-04-28T15:00:00Z',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toHaveLength(1);
      expect(res.body.data.conflicts).toHaveLength(0);
    });

    it('should return 400 for empty assignments array', async function () {
      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', 'Bearer valid-token')
        .send({ assignments: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 207 with partial success when some assignments conflict', async function () {
      prisma.station.findUnique.mockResolvedValue(mockStation);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-1' });
      // First assignment: no conflicts
      // Second assignment: user conflict
      prisma.schedule.findMany
        .mockResolvedValueOnce([]) // no user conflict for first
        .mockResolvedValueOnce([mockSchedule]); // user conflict for second
      prisma.schedule.count.mockResolvedValue(0);
      prisma.schedule.create.mockResolvedValue(mockSchedule);

      const res = await request(app)
        .post('/api/schedules/assign')
        .set('Authorization', 'Bearer valid-token')
        .send({
          assignments: [
            {
              stationId: 'station-uuid-1',
              userId: 'user-uuid-1',
              startTime: '2024-04-29T07:00:00Z',
              endTime: '2024-04-29T15:00:00Z',
            },
            {
              stationId: 'station-uuid-1',
              userId: 'user-uuid-1',
              startTime: '2024-04-29T08:00:00Z',
              endTime: '2024-04-29T16:00:00Z',
            },
          ],
        });

      expect(res.status).toBe(207);
    });
  });

  // ─── GET /api/schedules/weekly ────────────────────────────────────────────

  describe('GET /api/schedules/weekly', function () {
    it('should return weekly schedule grid', async function () {
      prisma.schedule.findMany.mockResolvedValue([mockSchedule]);
      prisma.station.findMany.mockResolvedValue([mockStation]);

      const res = await request(app)
        .get('/api/schedules/weekly?weekStart=2024-04-27')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grid).toBeDefined();
      expect(res.body.data.days).toHaveLength(7);
    });

    it('should return 400 for invalid weekStart date', async function () {
      const res = await request(app)
        .get('/api/schedules/weekly?weekStart=invalid-date')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/schedules/stats ─────────────────────────────────────────────

  describe('GET /api/schedules/stats', function () {
    it('should return schedule statistics', async function () {
      prisma.station.count.mockResolvedValue(12);
      prisma.schedule.count.mockResolvedValue(34);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.station.findMany.mockResolvedValue([mockStation]);

      const res = await request(app)
        .get('/api/schedules/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalStations');
      expect(res.body.data).toHaveProperty('onDutyNow');
      expect(res.body.data).toHaveProperty('openShiftsToday');
      expect(res.body.data).toHaveProperty('criticalShifts');
    });
  });
});

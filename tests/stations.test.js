/**
 * Stations API Integration Tests
 * Tests all CRUD endpoints for /api/stations.
 *
 * Run with: npm test
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// We import the app (not the server) to avoid port conflicts
let app;

// Mock Prisma to avoid real DB calls in unit tests
jest.mock('../src/config/prisma', () => ({
  station: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  schedule: {
    count: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');

// Helper: generate a valid JWT for tests
function makeToken(role = 'admin') {
  return jwt.sign(
    { id: 'test-user-id', email: 'test@krizot.com', role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

const ADMIN_TOKEN = makeToken('admin');
const MANAGER_TOKEN = makeToken('manager');

const mockStation = {
  id: 'station-uuid-1',
  name: 'Alpha',
  location: 'North Sector',
  capacity: 4,
  status: 'ACTIVE',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  _count: { schedules: 0 },
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  app = require('../src/index');
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/stations ────────────────────────────────────────────────────────

describe('GET /api/stations', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/stations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns paginated list of stations', async () => {
    prisma.station.findMany.mockResolvedValue([mockStation]);
    prisma.station.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it('supports search query parameter', async () => {
    prisma.station.findMany.mockResolvedValue([]);
    prisma.station.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/stations?search=Alpha')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(prisma.station.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: 'Alpha' }) }),
          ]),
        }),
      })
    );
  });

  it('supports status filter', async () => {
    prisma.station.findMany.mockResolvedValue([mockStation]);
    prisma.station.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/stations?status=ACTIVE')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
  });
});

// ─── GET /api/stations/:id ────────────────────────────────────────────────────

describe('GET /api/stations/:id', () => {
  it('returns 404 for non-existent station', async () => {
    prisma.station.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/stations/non-existent-id')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns station data for valid ID', async () => {
    prisma.station.findUnique.mockResolvedValue({
      ...mockStation,
      schedules: [],
    });

    const res = await request(app)
      .get(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(mockStation.id);
    expect(res.body.data.name).toBe('Alpha');
  });
});

// ─── POST /api/stations ───────────────────────────────────────────────────────

describe('POST /api/stations', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Alpha' }); // missing location and capacity

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when capacity is out of range', async () => {
    const res = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Alpha', location: 'North', capacity: 25 });

    expect(res.status).toBe(400);
  });

  it('returns 409 when station name already exists', async () => {
    prisma.station.findFirst.mockResolvedValue(mockStation); // duplicate found

    const res = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Alpha', location: 'North', capacity: 4 });

    expect(res.status).toBe(409);
  });

  it('creates a station with valid data', async () => {
    prisma.station.findFirst.mockResolvedValue(null); // no duplicate
    prisma.station.create.mockResolvedValue(mockStation);

    const res = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Alpha', location: 'North Sector', capacity: 4 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alpha');
    expect(res.body.message).toBe('Station created successfully');
  });

  it('creates a station with all optional fields', async () => {
    prisma.station.findFirst.mockResolvedValue(null);
    prisma.station.create.mockResolvedValue({ ...mockStation, notes: 'Test notes', status: 'CLOSED' });

    const res = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Alpha',
        location: 'North Sector',
        capacity: 4,
        status: 'CLOSED',
        notes: 'Test notes',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ─── PUT /api/stations/:id ────────────────────────────────────────────────────

describe('PUT /api/stations/:id', () => {
  it('returns 404 for non-existent station', async () => {
    prisma.station.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/stations/non-existent-id')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .put(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 409 when new name conflicts with existing station', async () => {
    prisma.station.findUnique.mockResolvedValue(mockStation);
    prisma.station.findFirst.mockResolvedValue({ ...mockStation, id: 'other-id' }); // duplicate

    const res = await request(app)
      .put(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Beta' });

    expect(res.status).toBe(409);
  });

  it('updates station successfully', async () => {
    const updated = { ...mockStation, name: 'Alpha Updated', capacity: 6 };
    prisma.station.findUnique.mockResolvedValue(mockStation);
    prisma.station.findFirst.mockResolvedValue(null); // no duplicate
    prisma.station.update.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Alpha Updated', capacity: 6 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alpha Updated');
    expect(res.body.message).toBe('Station updated successfully');
  });
});

// ─── DELETE /api/stations/:id ─────────────────────────────────────────────────

describe('DELETE /api/stations/:id', () => {
  it('returns 404 for non-existent station', async () => {
    prisma.station.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/stations/non-existent-id')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when station has future schedules', async () => {
    prisma.station.findUnique.mockResolvedValue(mockStation);
    prisma.schedule.count.mockResolvedValue(3); // has future schedules

    const res = await request(app)
      .delete(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('upcoming schedule');
  });

  it('deletes station successfully when no future schedules', async () => {
    prisma.station.findUnique.mockResolvedValue(mockStation);
    prisma.schedule.count.mockResolvedValue(0); // no future schedules
    prisma.station.delete.mockResolvedValue(mockStation);

    const res = await request(app)
      .delete(`/api/stations/${mockStation.id}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Station deleted successfully');
  });
});

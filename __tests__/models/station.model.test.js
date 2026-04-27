/**
 * Station Model Tests
 */

jest.mock('../../src/config/database', () => ({
  prisma: {
    station: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { prisma } = require('../../src/config/database');
const {
  StationStatus,
  findStationById,
  createStation,
  updateStation,
  deleteStation,
  listStations,
  getStationStats,
  isStationNameTaken,
} = require('../../src/models/station.model');

describe('Station Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StationStatus enum', () => {
    it('should have correct status values', () => {
      expect(StationStatus.ACTIVE).toBe('ACTIVE');
      expect(StationStatus.CLOSED).toBe('CLOSED');
      expect(StationStatus.MAINTENANCE).toBe('MAINTENANCE');
    });
  });

  describe('findStationById', () => {
    it('should find station by ID', async () => {
      const mockStation = { id: 'station-1', name: 'Alpha', location: 'North', capacity: 4 };
      prisma.station.findUnique.mockResolvedValue(mockStation);

      const result = await findStationById('station-1');

      expect(prisma.station.findUnique).toHaveBeenCalledWith({
        where: { id: 'station-1' },
        include: undefined,
      });
      expect(result).toEqual(mockStation);
    });

    it('should include schedules when requested', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await findStationById('station-1', true);

      expect(prisma.station.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            schedules: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('createStation', () => {
    it('should create station with trimmed values', async () => {
      const mockStation = { id: 'new-station', name: 'Alpha' };
      prisma.station.create.mockResolvedValue(mockStation);

      const result = await createStation({
        name: '  Alpha Station  ',
        location: '  North  ',
        capacity: 4,
      });

      expect(prisma.station.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Alpha Station',
            location: 'North',
            capacity: 4,
            status: StationStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('updateStation', () => {
    it('should only update provided fields', async () => {
      prisma.station.update.mockResolvedValue({});

      await updateStation('station-1', { capacity: 6 });

      expect(prisma.station.update).toHaveBeenCalledWith({
        where: { id: 'station-1' },
        data: { capacity: 6 },
      });
    });
  });

  describe('deleteStation', () => {
    it('should delete station by ID', async () => {
      prisma.station.delete.mockResolvedValue({ id: 'station-1' });

      await deleteStation('station-1');

      expect(prisma.station.delete).toHaveBeenCalledWith({
        where: { id: 'station-1' },
      });
    });
  });

  describe('listStations', () => {
    it('should return paginated results', async () => {
      prisma.station.findMany.mockResolvedValue([]);
      prisma.station.count.mockResolvedValue(0);

      const result = await listStations();

      expect(result).toMatchObject({
        stations: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should filter by status', async () => {
      prisma.station.findMany.mockResolvedValue([]);
      prisma.station.count.mockResolvedValue(0);

      await listStations({ status: StationStatus.ACTIVE });

      expect(prisma.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: StationStatus.ACTIVE },
        })
      );
    });
  });

  describe('getStationStats', () => {
    it('should return counts for all statuses', async () => {
      prisma.station.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7)  // active
        .mockResolvedValueOnce(2)  // closed
        .mockResolvedValueOnce(1); // maintenance

      const stats = await getStationStats();

      expect(stats).toEqual({
        total: 10,
        active: 7,
        closed: 2,
        maintenance: 1,
      });
    });
  });

  describe('isStationNameTaken', () => {
    it('should return true when name exists', async () => {
      prisma.station.count.mockResolvedValue(1);

      const result = await isStationNameTaken('Alpha Station');
      expect(result).toBe(true);
    });

    it('should return false when name does not exist', async () => {
      prisma.station.count.mockResolvedValue(0);

      const result = await isStationNameTaken('New Station');
      expect(result).toBe(false);
    });
  });
});

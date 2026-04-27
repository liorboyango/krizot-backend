/**
 * Unit Tests - Station Model Utilities
 */

'use strict';

jest.mock('../../src/config/database', () => ({
  prisma: {
    station: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/config/database');
const {
  findStationById,
  listStations,
  createStation,
  updateStation,
  deleteStation,
  isStationActive,
} = require('../../src/models/stationModel');

describe('Station Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findStationById', () => {
    it('should find a station by ID', async () => {
      const mockStation = { id: 'st-1', name: 'Alpha', location: 'North', capacity: 4, status: 'ACTIVE' };
      prisma.station.findUnique.mockResolvedValue(mockStation);

      const result = await findStationById('st-1');
      expect(result).toEqual(mockStation);
      expect(prisma.station.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'st-1' } })
      );
    });

    it('should return null when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);
      const result = await findStationById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listStations', () => {
    it('should return paginated stations', async () => {
      const mockStations = [{ id: 'st-1' }, { id: 'st-2' }];
      prisma.station.findMany.mockResolvedValue(mockStations);
      prisma.station.count.mockResolvedValue(2);

      const result = await listStations({ page: 1, limit: 10 });

      expect(result).toEqual({ stations: mockStations, total: 2, page: 1, limit: 10 });
    });

    it('should filter by status', async () => {
      prisma.station.findMany.mockResolvedValue([]);
      prisma.station.count.mockResolvedValue(0);

      await listStations({ status: 'ACTIVE' });

      expect(prisma.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'ACTIVE' } })
      );
    });

    it('should apply search filter on name and location', async () => {
      prisma.station.findMany.mockResolvedValue([]);
      prisma.station.count.mockResolvedValue(0);

      await listStations({ search: 'north' });

      expect(prisma.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'north', mode: 'insensitive' } },
              { location: { contains: 'north', mode: 'insensitive' } },
            ],
          },
        })
      );
    });
  });

  describe('createStation', () => {
    it('should create a station with provided data', async () => {
      const stationData = { name: 'Alpha', location: 'North', capacity: 4 };
      const mockStation = { id: 'st-1', ...stationData, status: 'ACTIVE' };
      prisma.station.create.mockResolvedValue(mockStation);

      const result = await createStation(stationData);

      expect(prisma.station.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: stationData })
      );
      expect(result).toEqual(mockStation);
    });
  });

  describe('isStationActive', () => {
    it('should return true for active station', async () => {
      prisma.station.findUnique.mockResolvedValue({ status: 'ACTIVE' });
      const result = await isStationActive('st-1');
      expect(result).toBe(true);
    });

    it('should return false for closed station', async () => {
      prisma.station.findUnique.mockResolvedValue({ status: 'CLOSED' });
      const result = await isStationActive('st-1');
      expect(result).toBe(false);
    });

    it('should return false when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);
      const result = await isStationActive('nonexistent');
      expect(result).toBe(false);
    });
  });
});

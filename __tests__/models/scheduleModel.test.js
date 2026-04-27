/**
 * Unit Tests - Schedule Model Utilities
 */

'use strict';

jest.mock('../../src/config/database', () => ({
  prisma: {
    schedule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/config/database');
const {
  findScheduleById,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  findUserConflicts,
  countStationAssignments,
  bulkCreateSchedules,
} = require('../../src/models/scheduleModel');

describe('Schedule Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findScheduleById', () => {
    it('should find a schedule by ID', async () => {
      const mockSchedule = {
        id: 'sch-1',
        stationId: 'st-1',
        userId: 'usr-1',
        startTime: new Date('2024-01-01T07:00:00Z'),
        endTime: new Date('2024-01-01T15:00:00Z'),
      };
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await findScheduleById('sch-1');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('listSchedules', () => {
    it('should return paginated schedules', async () => {
      const mockSchedules = [{ id: 'sch-1' }, { id: 'sch-2' }];
      prisma.schedule.findMany.mockResolvedValue(mockSchedules);
      prisma.schedule.count.mockResolvedValue(2);

      const result = await listSchedules({ page: 1, limit: 10 });

      expect(result).toEqual({ schedules: mockSchedules, total: 2, page: 1, limit: 10 });
    });

    it('should filter by stationId', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);

      await listSchedules({ stationId: 'st-1' });

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'st-1' }) })
      );
    });

    it('should filter by date range', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);

      const startFrom = '2024-01-01T00:00:00Z';
      const startTo = '2024-01-07T23:59:59Z';
      await listSchedules({ startFrom, startTo });

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: new Date(startFrom),
              lte: new Date(startTo),
            },
          }),
        })
      );
    });
  });

  describe('createSchedule', () => {
    it('should convert string dates to Date objects', async () => {
      const scheduleData = {
        stationId: 'st-1',
        userId: 'usr-1',
        startTime: '2024-01-01T07:00:00Z',
        endTime: '2024-01-01T15:00:00Z',
      };
      prisma.schedule.create.mockResolvedValue({ id: 'sch-1', ...scheduleData });

      await createSchedule(scheduleData);

      expect(prisma.schedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startTime: new Date('2024-01-01T07:00:00Z'),
            endTime: new Date('2024-01-01T15:00:00Z'),
          }),
        })
      );
    });
  });

  describe('findUserConflicts', () => {
    it('should detect overlapping shifts for a user', async () => {
      const conflictingSchedule = { id: 'sch-existing', userId: 'usr-1' };
      prisma.schedule.findMany.mockResolvedValue([conflictingSchedule]);

      const conflicts = await findUserConflicts(
        'usr-1',
        '2024-01-01T08:00:00Z',
        '2024-01-01T16:00:00Z'
      );

      expect(conflicts).toHaveLength(1);
      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'usr-1',
            AND: [
              { startTime: { lt: new Date('2024-01-01T16:00:00Z') } },
              { endTime: { gt: new Date('2024-01-01T08:00:00Z') } },
            ],
          }),
        })
      );
    });

    it('should exclude a specific schedule when checking conflicts (for updates)', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      await findUserConflicts(
        'usr-1',
        '2024-01-01T08:00:00Z',
        '2024-01-01T16:00:00Z',
        'sch-to-exclude'
      );

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'sch-to-exclude' },
          }),
        })
      );
    });
  });

  describe('countStationAssignments', () => {
    it('should count assigned users in a time window', async () => {
      prisma.schedule.count.mockResolvedValue(3);

      const count = await countStationAssignments(
        'st-1',
        '2024-01-01T07:00:00Z',
        '2024-01-01T15:00:00Z'
      );

      expect(count).toBe(3);
      expect(prisma.schedule.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stationId: 'st-1',
            userId: { not: null },
          }),
        })
      );
    });
  });

  describe('bulkCreateSchedules', () => {
    it('should create multiple schedules at once', async () => {
      prisma.schedule.createMany.mockResolvedValue({ count: 2 });

      const schedulesData = [
        { stationId: 'st-1', userId: 'usr-1', startTime: '2024-01-01T07:00:00Z', endTime: '2024-01-01T15:00:00Z' },
        { stationId: 'st-2', userId: 'usr-2', startTime: '2024-01-01T07:00:00Z', endTime: '2024-01-01T15:00:00Z' },
      ];

      const result = await bulkCreateSchedules(schedulesData);

      expect(result).toEqual({ count: 2 });
      expect(prisma.schedule.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            startTime: new Date('2024-01-01T07:00:00Z'),
            endTime: new Date('2024-01-01T15:00:00Z'),
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});

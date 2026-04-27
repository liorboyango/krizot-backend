/**
 * Schedule Model Tests
 */

jest.mock('../../src/config/database', () => ({
  prisma: {
    schedule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
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
  ScheduleStatus,
  findScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listSchedules,
  getSchedulesForDateRange,
  assignUserToSchedule,
  unassignUserFromSchedule,
  checkUserConflicts,
  bulkAssignSchedules,
  getScheduleStats,
} = require('../../src/models/schedule.model');

describe('Schedule Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ScheduleStatus enum', () => {
    it('should have all required statuses', () => {
      expect(ScheduleStatus.OPEN).toBe('OPEN');
      expect(ScheduleStatus.ASSIGNED).toBe('ASSIGNED');
      expect(ScheduleStatus.COVERED).toBe('COVERED');
      expect(ScheduleStatus.CRITICAL).toBe('CRITICAL');
      expect(ScheduleStatus.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('findScheduleById', () => {
    it('should find schedule with relations', async () => {
      const mockSchedule = { id: 'sched-1', stationId: 'st-1', userId: 'u-1' };
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await findScheduleById('sched-1');

      expect(prisma.schedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        include: expect.objectContaining({
          station: expect.any(Object),
          user: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('createSchedule', () => {
    it('should set status to ASSIGNED when userId provided', async () => {
      prisma.schedule.create.mockResolvedValue({});

      await createSchedule({
        stationId: 'st-1',
        userId: 'u-1',
        startTime: new Date('2024-01-01T07:00:00Z'),
        endTime: new Date('2024-01-01T15:00:00Z'),
      });

      expect(prisma.schedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ScheduleStatus.ASSIGNED,
          }),
        })
      );
    });

    it('should set status to OPEN when no userId', async () => {
      prisma.schedule.create.mockResolvedValue({});

      await createSchedule({
        stationId: 'st-1',
        startTime: new Date('2024-01-01T07:00:00Z'),
        endTime: new Date('2024-01-01T15:00:00Z'),
      });

      expect(prisma.schedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ScheduleStatus.OPEN,
            userId: null,
          }),
        })
      );
    });
  });

  describe('assignUserToSchedule', () => {
    it('should update userId and set status to ASSIGNED', async () => {
      prisma.schedule.update.mockResolvedValue({});

      await assignUserToSchedule('sched-1', 'user-1');

      expect(prisma.schedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: { userId: 'user-1', status: ScheduleStatus.ASSIGNED },
        include: expect.any(Object),
      });
    });
  });

  describe('unassignUserFromSchedule', () => {
    it('should clear userId and set status to OPEN', async () => {
      prisma.schedule.update.mockResolvedValue({});

      await unassignUserFromSchedule('sched-1');

      expect(prisma.schedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: { userId: null, status: ScheduleStatus.OPEN },
        include: expect.any(Object),
      });
    });
  });

  describe('listSchedules', () => {
    it('should return paginated results with default options', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);

      const result = await listSchedules();

      expect(result).toMatchObject({
        schedules: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should filter by date range', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      await listSchedules({ startDate, endDate });

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('checkUserConflicts', () => {
    it('should query for overlapping schedules', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      const startTime = new Date('2024-01-01T07:00:00Z');
      const endTime = new Date('2024-01-01T15:00:00Z');

      const conflicts = await checkUserConflicts('user-1', startTime, endTime);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            OR: expect.any(Array),
          }),
        })
      );
      expect(conflicts).toEqual([]);
    });
  });

  describe('bulkAssignSchedules', () => {
    it('should use transaction for bulk operations', async () => {
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const assignments = [
        { scheduleId: 'sched-1', userId: 'user-1' },
        { scheduleId: 'sched-2', userId: 'user-2' },
      ];

      const results = await bulkAssignSchedules(assignments);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });
  });

  describe('getScheduleStats', () => {
    it('should return counts for all statuses', async () => {
      prisma.schedule.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(5)  // open
        .mockResolvedValueOnce(10) // assigned
        .mockResolvedValueOnce(3)  // covered
        .mockResolvedValueOnce(2); // critical

      const stats = await getScheduleStats();

      expect(stats).toEqual({
        total: 20,
        open: 5,
        assigned: 10,
        covered: 3,
        critical: 2,
      });
    });
  });
});

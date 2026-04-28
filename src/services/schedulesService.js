/**
 * Schedules Service — Firestore-backed scheduling business logic.
 *
 * Conflict-detection note: Firestore disallows range filters on two
 * different fields in the same query. We over-fetch using `endTime > windowStart`,
 * then filter `startTime < windowEnd` in memory.
 */

'use strict';

const scheduleModel = require('../models/scheduleModel');
const stationModel = require('../models/stationModel');
const userModel = require('../models/userModel');
const { db, Timestamp } = require('../config/firebaseAdmin');
const { AppError } = require('../utils/errors');

async function listSchedules(filters, limit, cursor) {
  const safe = filters || {};
  return scheduleModel.listSchedules({
    limit: limit || 50,
    stationId: safe.stationId,
    userId: safe.userId,
    startFrom: safe.startDate,
    startTo: safe.endDate,
    cursor,
  });
}

async function getScheduleById(id) {
  return scheduleModel.findScheduleById(id);
}

async function detectConflicts(stationId, userId, startTime, endTime, excludeScheduleId) {
  const conflicts = [];
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (userId) {
    const userConflicts = await scheduleModel.findUserConflicts(userId, start, end, excludeScheduleId);
    for (const c of userConflicts) {
      conflicts.push({
        type: 'USER_DOUBLE_BOOKING',
        message: `User is already assigned to station "${c.station ? c.station.name : c.stationId}" during this time`,
        conflictingScheduleId: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
  }

  const station = await stationModel.findStationById(stationId);
  if (station) {
    const count = await scheduleModel.countStationAssignments(stationId, start, end, excludeScheduleId);
    if (count >= station.capacity) {
      conflicts.push({
        type: 'STATION_CAPACITY_EXCEEDED',
        message: `Station "${station.name}" is at full capacity (${station.capacity}) for this time slot`,
        stationId,
        capacity: station.capacity,
        currentAssignments: count,
      });
    }
  }

  return conflicts;
}

async function createSchedule(data) {
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  const station = await stationModel.findStationById(data.stationId);
  if (!station) throw new AppError('Station not found', 404);

  if (data.userId) {
    const user = await userModel.findUserById(data.userId);
    if (!user) throw new AppError('User not found', 404);
  }

  const conflicts = await detectConflicts(data.stationId, data.userId || null, startTime, endTime, null);
  if (conflicts.length > 0) {
    const err = new AppError('Scheduling conflict detected', 409);
    err.code = 'CONFLICT';
    err.conflicts = conflicts;
    throw err;
  }

  return scheduleModel.createSchedule({
    stationId: data.stationId,
    userId: data.userId || null,
    startTime,
    endTime,
    notes: data.notes || null,
  });
}

async function updateSchedule(id, data) {
  const existing = await scheduleModel.findScheduleRawById(id);
  if (!existing) throw new AppError('Schedule not found', 404);

  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
  const stationId = data.stationId || existing.stationId;
  const userId = data.userId !== undefined ? data.userId : existing.userId;

  if (endTime <= startTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  const conflicts = await detectConflicts(stationId, userId, startTime, endTime, id);
  if (conflicts.length > 0) {
    const err = new AppError('Scheduling conflict detected', 409);
    err.code = 'CONFLICT';
    err.conflicts = conflicts;
    throw err;
  }

  return scheduleModel.updateSchedule(id, {
    stationId: data.stationId,
    userId: data.userId,
    startTime: data.startTime,
    endTime: data.endTime,
    notes: data.notes,
  });
}

async function deleteSchedule(id) {
  await scheduleModel.deleteSchedule(id);
}

async function bulkAssignShifts(assignments) {
  const created = [];
  const conflicts = [];
  for (const assignment of assignments) {
    try {
      const schedule = await createSchedule(assignment);
      created.push(schedule);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        conflicts.push({ assignment, conflicts: err.conflicts, message: err.message });
      } else {
        throw err;
      }
    }
  }
  return { created, conflicts };
}

async function getWeeklySchedule(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const [scheduleSnap, stationsResult] = await Promise.all([
    db
      .collection(scheduleModel.SCHEDULES_COLLECTION)
      .where('startTime', '>=', Timestamp.fromDate(new Date(weekStart)))
      .where('startTime', '<=', Timestamp.fromDate(weekEnd))
      .orderBy('startTime', 'asc')
      .get(),
    stationModel.listStations({ limit: 500, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' }),
  ]);

  const schedules = await Promise.all(
    scheduleSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        stationId: data.stationId,
        userId: data.userId ?? null,
        startTime: data.startTime ? data.startTime.toDate().toISOString() : null,
        endTime: data.endTime ? data.endTime.toDate().toISOString() : null,
        notes: data.notes ?? null,
      };
    })
  );

  const stations = stationsResult.stations;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    days.push({
      date: dayStr,
      dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
      schedules: schedules.filter((s) => (s.startTime || '').startsWith(dayStr)),
    });
  }

  const grid = stations.map((station) => ({
    station,
    days: days.map((day) => ({
      date: day.date,
      dayName: day.dayName,
      schedules: day.schedules.filter((s) => s.stationId === station.id),
    })),
  }));

  return {
    weekStart: new Date(weekStart).toISOString(),
    weekEnd: weekEnd.toISOString(),
    days: days.map((d) => ({ date: d.date, dayName: d.dayName })),
    grid,
  };
}

async function getScheduleStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const stationsResult = await stationModel.listStations({ limit: 1000, status: 'ACTIVE' });
  const activeStations = stationsResult.stations;
  const totalStations = activeStations.length;

  // Schedules currently in progress (over-fetch by endTime > now, then filter startTime <= now in memory).
  const inProgressSnap = await db
    .collection(scheduleModel.SCHEDULES_COLLECTION)
    .where('endTime', '>', Timestamp.fromDate(now))
    .get();

  let onDutyNow = 0;
  const coveredIdsSoon = new Set();
  inProgressSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.userId) return;
    const start = data.startTime ? data.startTime.toDate() : null;
    if (start && start <= now) {
      onDutyNow += 1;
      coveredIdsSoon.add(data.stationId);
    }
    if (start && start <= twoHoursLater) {
      coveredIdsSoon.add(data.stationId);
    }
  });

  const todaySnap = await db
    .collection(scheduleModel.SCHEDULES_COLLECTION)
    .where('startTime', '>=', Timestamp.fromDate(todayStart))
    .where('startTime', '<=', Timestamp.fromDate(todayEnd))
    .get();

  const assignedStationIds = new Set(
    todaySnap.docs.filter((doc) => doc.data().userId).map((doc) => doc.data().stationId)
  );
  const openShiftsToday = activeStations.filter((s) => !assignedStationIds.has(s.id)).length;
  const criticalShifts = activeStations.filter((s) => !coveredIdsSoon.has(s.id)).length;

  return { totalStations, onDutyNow, openShiftsToday, criticalShifts };
}

module.exports = {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bulkAssignShifts,
  getWeeklySchedule,
  getScheduleStats,
  detectConflicts,
};

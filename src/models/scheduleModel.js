/**
 * Schedule Model — Firestore
 *
 * Schedules live in `schedules` (auto-id). Each doc references a station and
 * (optionally) a user via stored ID fields. Times are persisted as Firestore
 * Timestamps and serialised to ISO strings on the way out.
 */

'use strict';

const { db, Timestamp, FieldValue } = require('../config/firebaseAdmin');
const stationModel = require('./stationModel');
const userModel = require('./userModel');

const SCHEDULES_COLLECTION = 'schedules';

function scheduleDocToRaw(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    stationId: data.stationId,
    userId: data.userId ?? null,
    startTime: data.startTime ? data.startTime.toDate() : null,
    endTime: data.endTime ? data.endTime.toDate() : null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

async function hydrateSchedule(raw) {
  if (!raw) return null;
  const [station, user] = await Promise.all([
    raw.stationId ? stationModel.findStationById(raw.stationId) : null,
    raw.userId ? userModel.findUserById(raw.userId) : null,
  ]);
  return {
    ...raw,
    startTime: raw.startTime ? raw.startTime.toISOString() : null,
    endTime: raw.endTime ? raw.endTime.toISOString() : null,
    station: station ? { id: station.id, name: station.name, location: station.location, capacity: station.capacity, status: station.status } : null,
    user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
  };
}

async function findScheduleById(id) {
  const snap = await db.collection(SCHEDULES_COLLECTION).doc(id).get();
  const raw = scheduleDocToRaw(snap);
  return hydrateSchedule(raw);
}

async function findScheduleRawById(id) {
  const snap = await db.collection(SCHEDULES_COLLECTION).doc(id).get();
  return scheduleDocToRaw(snap);
}

/**
 * List schedules with cursor pagination.
 * Filters: stationId, userId, startFrom, startTo.
 * Note: Firestore allows range filters on a single field per query, so we use
 * startTime for the date window. Any combined filter that needs a different
 * range field would require a composite-index workaround.
 */
async function listSchedules({ limit = 50, stationId, userId, startFrom, startTo, cursor } = {}) {
  let query = db.collection(SCHEDULES_COLLECTION);
  if (stationId) query = query.where('stationId', '==', stationId);
  if (userId) query = query.where('userId', '==', userId);
  if (startFrom) query = query.where('startTime', '>=', Timestamp.fromDate(new Date(startFrom)));
  if (startTo) query = query.where('startTime', '<=', Timestamp.fromDate(new Date(startTo)));
  query = query.orderBy('startTime', 'asc');

  if (cursor) {
    const cursorSnap = await db.collection(SCHEDULES_COLLECTION).doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }

  const snap = await query.limit(limit).get();
  const schedules = await Promise.all(snap.docs.map((d) => hydrateSchedule(scheduleDocToRaw(d))));
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { schedules, nextCursor };
}

async function createSchedule(data) {
  const now = FieldValue.serverTimestamp();
  const ref = await db.collection(SCHEDULES_COLLECTION).add({
    stationId: data.stationId,
    userId: data.userId || null,
    startTime: Timestamp.fromDate(new Date(data.startTime)),
    endTime: Timestamp.fromDate(new Date(data.endTime)),
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return findScheduleById(ref.id);
}

async function updateSchedule(id, data) {
  const update = { updatedAt: FieldValue.serverTimestamp() };
  if (data.stationId !== undefined) update.stationId = data.stationId;
  if (data.userId !== undefined) update.userId = data.userId || null;
  if (data.startTime !== undefined) update.startTime = Timestamp.fromDate(new Date(data.startTime));
  if (data.endTime !== undefined) update.endTime = Timestamp.fromDate(new Date(data.endTime));
  if (data.notes !== undefined) update.notes = data.notes;
  await db.collection(SCHEDULES_COLLECTION).doc(id).update(update);
  return findScheduleById(id);
}

async function deleteSchedule(id) {
  await db.collection(SCHEDULES_COLLECTION).doc(id).delete();
}

/**
 * Find schedules for a user that overlap a given time window.
 * Firestore can't do range queries on two fields simultaneously, so we
 * fetch all of the user's schedules with `endTime > windowStart` and filter
 * `startTime < windowEnd` in memory.
 */
async function findUserConflicts(userId, startTime, endTime, excludeScheduleId = null) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const snap = await db
    .collection(SCHEDULES_COLLECTION)
    .where('userId', '==', userId)
    .where('endTime', '>', Timestamp.fromDate(start))
    .get();

  const conflicts = [];
  for (const doc of snap.docs) {
    if (excludeScheduleId && doc.id === excludeScheduleId) continue;
    const raw = scheduleDocToRaw(doc);
    if (raw.startTime && raw.startTime < end) {
      conflicts.push(await hydrateSchedule(raw));
    }
  }
  return conflicts;
}

async function countStationAssignments(stationId, startTime, endTime, excludeScheduleId = null) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const snap = await db
    .collection(SCHEDULES_COLLECTION)
    .where('stationId', '==', stationId)
    .where('endTime', '>', Timestamp.fromDate(start))
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    if (excludeScheduleId && doc.id === excludeScheduleId) continue;
    const data = doc.data();
    if (!data.userId) continue;
    if (data.startTime && data.startTime.toDate() < end) count += 1;
  }
  return count;
}

async function bulkCreateSchedules(rows) {
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  const refs = [];
  for (const row of rows) {
    const ref = db.collection(SCHEDULES_COLLECTION).doc();
    batch.set(ref, {
      stationId: row.stationId,
      userId: row.userId || null,
      startTime: Timestamp.fromDate(new Date(row.startTime)),
      endTime: Timestamp.fromDate(new Date(row.endTime)),
      notes: row.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
    refs.push(ref);
  }
  await batch.commit();
  return { count: refs.length, ids: refs.map((r) => r.id) };
}

module.exports = {
  SCHEDULES_COLLECTION,
  findScheduleById,
  findScheduleRawById,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  findUserConflicts,
  countStationAssignments,
  bulkCreateSchedules,
};

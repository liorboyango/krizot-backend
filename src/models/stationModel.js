/**
 * Station Model — Firestore
 *
 * Stations are stored in the top-level `stations` collection with auto-IDs.
 */

'use strict';

const { db, FieldValue } = require('../config/firebaseAdmin');

const STATIONS_COLLECTION = 'stations';

function stationDocToObject(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    location: data.location,
    capacity: data.capacity,
    status: data.status,
    notes: data.notes ?? null,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

async function findStationById(id) {
  const snap = await db.collection(STATIONS_COLLECTION).doc(id).get();
  return stationDocToObject(snap);
}

/**
 * List stations with simple filters and cursor-based pagination.
 * Note: Firestore doesn't support OR / case-insensitive substring search out of the box,
 * so `search` filtering happens server-side in memory after the page is fetched.
 */
async function listStations({ limit = 20, status, search, sortBy = 'name', sortOrder = 'asc', cursor } = {}) {
  const allowedSort = ['name', 'location', 'capacity', 'status', 'createdAt', 'updatedAt'];
  const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  let query = db.collection(STATIONS_COLLECTION).orderBy(safeSortBy, safeSortOrder);
  if (status) query = query.where('status', '==', status);
  if (cursor) {
    const cursorSnap = await db.collection(STATIONS_COLLECTION).doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }

  const snap = await query.limit(limit).get();
  let stations = snap.docs.map(stationDocToObject);

  if (search) {
    const needle = search.toLowerCase();
    stations = stations.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(needle)) ||
        (s.location && s.location.toLowerCase().includes(needle))
    );
  }

  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { stations, nextCursor };
}

async function findStationByName(name) {
  const snap = await db
    .collection(STATIONS_COLLECTION)
    .where('name', '==', name)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return stationDocToObject(snap.docs[0]);
}

async function createStation(data) {
  const now = FieldValue.serverTimestamp();
  const ref = await db.collection(STATIONS_COLLECTION).add({
    name: data.name,
    location: data.location,
    capacity: data.capacity,
    status: data.status || 'ACTIVE',
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return findStationById(ref.id);
}

async function updateStation(id, data) {
  const update = { updatedAt: FieldValue.serverTimestamp() };
  if (data.name !== undefined) update.name = data.name;
  if (data.location !== undefined) update.location = data.location;
  if (data.capacity !== undefined) update.capacity = data.capacity;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;
  await db.collection(STATIONS_COLLECTION).doc(id).update(update);
  return findStationById(id);
}

async function deleteStation(id) {
  await db.collection(STATIONS_COLLECTION).doc(id).delete();
}

async function isStationActive(id) {
  const station = await findStationById(id);
  return station?.status === 'ACTIVE';
}

module.exports = {
  STATIONS_COLLECTION,
  findStationById,
  findStationByName,
  listStations,
  createStation,
  updateStation,
  deleteStation,
  isStationActive,
};

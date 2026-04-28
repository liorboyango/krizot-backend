/**
 * Stations Service — Firestore-backed business logic for stations.
 */

'use strict';

const stationModel = require('../models/stationModel');
const scheduleModel = require('../models/scheduleModel');
const { db, Timestamp } = require('../config/firebaseAdmin');
const { AppError } = require('../utils/errors');

async function listStations({ limit, search, status, sortBy, sortOrder, cursor }) {
  const safeStatus = status ? status.toUpperCase() : undefined;
  return stationModel.listStations({
    limit,
    status: safeStatus && ['ACTIVE', 'CLOSED'].includes(safeStatus) ? safeStatus : undefined,
    search,
    sortBy,
    sortOrder,
    cursor,
  });
}

async function getStationById(id) {
  return stationModel.findStationById(id);
}

async function createStation({ name, location, capacity, status = 'ACTIVE', notes }) {
  const existing = await stationModel.findStationByName(name);
  if (existing) {
    throw new AppError(`A station with the name "${name}" already exists`, 409);
  }
  return stationModel.createStation({
    name,
    location,
    capacity,
    status: status.toUpperCase(),
    notes: notes || null,
  });
}

async function updateStation(id, { name, location, capacity, status, notes }) {
  if (name) {
    const duplicate = await stationModel.findStationByName(name);
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`A station with the name "${name}" already exists`, 409);
    }
  }
  return stationModel.updateStation(id, {
    name,
    location,
    capacity,
    status: status ? status.toUpperCase() : undefined,
    notes,
  });
}

/**
 * Refuse to delete if any future schedules reference the station.
 */
async function deleteStation(id) {
  const snap = await db
    .collection(scheduleModel.SCHEDULES_COLLECTION)
    .where('stationId', '==', id)
    .where('startTime', '>=', Timestamp.fromDate(new Date()))
    .limit(1)
    .get();

  if (!snap.empty) {
    const totalSnap = await db
      .collection(scheduleModel.SCHEDULES_COLLECTION)
      .where('stationId', '==', id)
      .where('startTime', '>=', Timestamp.fromDate(new Date()))
      .get();
    throw new AppError(
      `Cannot delete station: it has ${totalSnap.size} upcoming schedule(s). Please reassign or cancel them first.`,
      409
    );
  }

  await stationModel.deleteStation(id);
}

module.exports = {
  listStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
};

/**
 * Models Index — Firestore-backed model exports.
 */

'use strict';

const userModel = require('./userModel');
const stationModel = require('./stationModel');
const scheduleModel = require('./scheduleModel');

module.exports = {
  userModel,
  stationModel,
  scheduleModel,
};

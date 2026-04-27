/**
 * Models Index
 * Central export point for all model utilities
 */

const userModel = require('./user.model');
const stationModel = require('./station.model');
const scheduleModel = require('./schedule.model');

module.exports = {
  // User model
  ...userModel,
  userModel,

  // Station model
  ...stationModel,
  stationModel,

  // Schedule model
  ...scheduleModel,
  scheduleModel,
};

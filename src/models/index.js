/**
 * Models Index
 *
 * Central export point for all model utilities.
 * Import from here to access any model helper.
 *
 * @example
 * const { userModel, stationModel, scheduleModel } = require('./models');
 * const user = await userModel.findUserById('uuid-here');
 */

'use strict';

const userModel = require('./userModel');
const stationModel = require('./stationModel');
const scheduleModel = require('./scheduleModel');
const refreshTokenModel = require('./refreshTokenModel');

module.exports = {
  userModel,
  stationModel,
  scheduleModel,
  refreshTokenModel,
};

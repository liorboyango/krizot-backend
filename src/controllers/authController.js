/**
 * Authentication Controller
 * Handles login, token refresh, logout, and current user retrieval.
 */

'use strict';

const authService = require('../services/authService');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * POST /api/auth/login
 * Authenticate user credentials and return JWT tokens.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Issue a new access token using a valid refresh token.
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshToken(token);
    sendSuccess(res, result, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Invalidate the user's refresh token.
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user.userId);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.userId);
    sendSuccess(res, user, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
}

module.exports = { login, refreshToken, logout, getMe };

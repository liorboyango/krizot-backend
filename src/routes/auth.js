/**
 * Authentication Routes
 * Handles user login, token refresh, and logout.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const authController = require('../controllers/authController');
const { loginSchema, refreshTokenSchema } = require('../validators/authValidators');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT tokens
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate refresh token (logout)
 * @access  Private (JWT)
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (JWT)
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;

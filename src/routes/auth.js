/**
 * Auth Routes
 *
 * POST /api/auth/login    - Authenticate user, return JWT tokens
 * POST /api/auth/logout   - Invalidate tokens
 * POST /api/auth/refresh  - Refresh access token
 * POST /api/auth/register - Register new user (admin only)
 * GET  /api/auth/me       - Get current user profile
 */

const express = require('express');
const router = express.Router();

const { login, logout, refreshToken, register, getMe } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimit } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return access + refresh tokens
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { success, data: { token, refreshToken, user } }
 */
router.post(
  '/login',
  authRateLimit,
  validate({ body: schemas.login }),
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate the current access token (and optionally refresh token)
 * @access  Private (requires valid JWT)
 * @body    { refreshToken?: string }
 * @returns { success, message }
 */
router.post(
  '/logout',
  authenticate,
  logout
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Issue a new access token using a valid refresh token
 * @access  Public (uses refresh token)
 * @body    { refreshToken: string }
 * @returns { success, data: { token } }
 */
router.post(
  '/refresh',
  authRateLimit,
  validate({ body: schemas.refreshToken }),
  refreshToken
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (admin only in production)
 * @access  Private (admin role required)
 * @body    { email, password, name, role }
 * @returns { success, data: { user } }
 */
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate({ body: schemas.register }),
  register
);

/**
 * @route   GET /api/auth/me
 * @desc    Get the currently authenticated user's profile
 * @access  Private
 * @returns { success, data: { user } }
 */
router.get(
  '/me',
  authenticate,
  getMe
);

module.exports = router;

/**
 * Auth Routes
 *
 * POST /api/auth/login    - Exchange email+password for Firebase ID + refresh tokens
 * POST /api/auth/logout   - Revoke the user's Firebase refresh tokens
 * POST /api/auth/refresh  - Exchange refresh token for a new ID token
 * POST /api/auth/register - Create a new Firebase Auth user (admin only)
 * GET  /api/auth/me       - Get the current user's profile
 */

'use strict';

const express = require('express');
const router = express.Router();

const { login, logout, refreshToken, register, getMe } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, validate({ body: schemas.login }), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, validate({ body: schemas.refreshToken }), refreshToken);
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate({ body: schemas.register }),
  register
);
router.get('/me', authenticate, getMe);

module.exports = router;

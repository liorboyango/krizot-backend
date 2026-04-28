/**
 * Auth Controller (Firebase Auth + Firestore)
 *
 *   POST /api/auth/login    → exchange email+password for ID + refresh tokens
 *   POST /api/auth/logout   → revoke the user's refresh tokens
 *   POST /api/auth/refresh  → exchange refresh token for a fresh ID token
 *   POST /api/auth/register → create a Firebase Auth user and Firestore profile
 *   GET  /api/auth/me       → return the current user's Firestore profile
 */

'use strict';

const { auth } = require('../config/firebaseAdmin');
const userModel = require('../models/userModel');
const { signInWithPassword, exchangeRefreshToken } = require('../utils/firebaseAuthRest');
const { AppError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await signInWithPassword(email.toLowerCase().trim(), password);

    const profile = await userModel.findUserById(result.localId);

    logger.info(`User logged in: ${email} (uid: ${result.localId})`);

    res.status(200).json({
      success: true,
      data: {
        token: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: Number(result.expiresIn),
        user: profile || {
          id: result.localId,
          email: result.email,
          name: result.displayName,
          role: 'manager',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    if (req.user && req.user.uid) {
      await auth.revokeRefreshTokens(req.user.uid);
      logger.info(`User logged out: ${req.user.email} (uid: ${req.user.uid})`);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw new AppError('refreshToken is required.', 400);
    }
    const result = await exchangeRefreshToken(token);
    res.status(200).json({
      success: true,
      data: {
        token: result.id_token,
        refreshToken: result.refresh_token,
        expiresIn: Number(result.expires_in),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { email, password, name, role = 'manager' } = req.body;

    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      throw new ConflictError('A user with this email already exists.');
    }

    let user;
    try {
      user = await userModel.createUser({ email, password, name, role });
    } catch (err) {
      if (err && err.code === 'auth/email-already-exists') {
        throw new ConflictError('A user with this email already exists.');
      }
      if (err && err.code === 'auth/invalid-password') {
        throw new AppError('Password is invalid (must be at least 6 characters).', 400);
      }
      throw err;
    }

    logger.info(`New user registered: ${user.email} (role: ${user.role})`);

    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────

async function getMe(req, res, next) {
  try {
    const user = await userModel.findUserById(req.user.uid);
    if (!user) throw new NotFoundError('User');
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, refreshToken, register, getMe };

/**
 * Auth Controller (Firebase Auth + Firestore)
 *
 *   POST /api/auth/login    → verify a Firebase ID token (obtained client-side
 *                             via the Firebase Client SDK) and return the
 *                             user's Firestore profile
 *   POST /api/auth/logout   → revoke the user's Firebase refresh tokens
 *   POST /api/auth/register → create a Firebase Auth user and Firestore profile
 *   GET  /api/auth/me       → return the current user's Firestore profile
 *
 * Token issuance and refresh happen entirely client-side against Firebase Auth;
 * the backend never calls the Identity Toolkit / secure-token REST endpoints.
 */

'use strict';

const { auth } = require('../config/firebaseAdmin');
const userModel = require('../models/userModel');
const { AppError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { idToken } = req.body;

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken, true);
    } catch (err) {
      if (err && err.code === 'auth/id-token-expired') {
        throw new AppError('ID token has expired. Please sign in again.', 401);
      }
      if (err && err.code === 'auth/id-token-revoked') {
        throw new AppError('ID token has been revoked. Please sign in again.', 401);
      }
      logger.warn('Login ID-token verification failed', { code: err && err.code, message: err && err.message });
      throw new AppError('Invalid ID token.', 401);
    }

    const profile = await userModel.findUserById(decoded.uid);

    logger.info(`User logged in: ${decoded.email} (uid: ${decoded.uid})`);

    res.status(200).json({
      success: true,
      data: {
        user: profile || {
          id: decoded.uid,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role || 'manager',
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

module.exports = { login, logout, register, getMe };

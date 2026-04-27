/**
 * Auth Controller
 *
 * Handles authentication operations:
 * - POST /api/auth/login    → issue access + refresh tokens
 * - POST /api/auth/logout   → blacklist access token
 * - POST /api/auth/refresh  → issue new access token from refresh token
 * - POST /api/auth/register → create new user (admin only in production)
 * - GET  /api/auth/me       → return current user profile
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { tokenBlacklist } = require('../utils/tokenBlacklist');
const { AppError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { success, data: { token, refreshToken, user } }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Use generic message to prevent user enumeration
      throw new AppError('Invalid email or password.', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info(`User logged in: ${user.email} (role: ${user.role})`);

    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <accessToken>
 * Body: { refreshToken } (optional — blacklists refresh token too)
 * Response: { success, message }
 */
async function logout(req, res, next) {
  try {
    // Blacklist the access token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.slice(7);
      tokenBlacklist.addToBlacklist(accessToken);
    }

    // Optionally blacklist the refresh token too
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      tokenBlacklist.addToBlacklist(refreshToken);
    }

    logger.info(`User logged out: ${req.user?.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Response: { success, data: { token } }
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;

    // Check if refresh token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new AppError('Refresh token has been invalidated. Please log in again.', 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Fetch fresh user data from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new AppError('User not found. Please log in again.', 401);
    }

    // Issue new access token
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.debug(`Access token refreshed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, password, name, role }
 * Auth: Admin only (or open during initial setup)
 * Response: { success, data: { user } }
 */
async function register(req, res, next) {
  try {
    const { email, password, name, role = 'manager' } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists.');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info(`New user registered: ${user.email} (role: ${user.role})`);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Auth: Required
 * Response: { success, data: { user } }
 */
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, refreshToken, register, getMe };

/**
 * Firebase Auth REST helpers
 *
 * The Firebase Admin SDK does not expose password sign-in or refresh-token
 * exchange — those are public REST endpoints (Identity Toolkit + secure-token).
 * This module wraps them and translates Firebase error codes into AppErrors.
 */

'use strict';

const env = require('../config/env');
const { AppError } = require('./errors');

const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1/accounts';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1/token';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data && data.error && data.error.message;
    const err = new Error(code || `Firebase request failed (${res.status})`);
    err.firebaseCode = code;
    err.status = res.status;
    throw err;
  }
  return data;
}

function mapSignInError(code) {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return new AppError('Invalid email or password.', 401);
    case 'USER_DISABLED':
      return new AppError('This account has been disabled.', 403);
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return new AppError('Too many sign-in attempts. Please try again later.', 429);
    default:
      return new AppError('Authentication failed.', 401);
  }
}

function mapRefreshError(code) {
  switch (code) {
    case 'TOKEN_EXPIRED':
    case 'INVALID_REFRESH_TOKEN':
    case 'USER_NOT_FOUND':
    case 'USER_DISABLED':
      return new AppError('Refresh token is invalid or expired. Please log in again.', 401);
    default:
      return new AppError('Failed to refresh token.', 401);
  }
}

/**
 * Exchange email/password for an ID token + refresh token via Identity Toolkit.
 * @returns {{ idToken: string, refreshToken: string, localId: string, expiresIn: string }}
 */
async function signInWithPassword(email, password) {
  const url = `${IDENTITY_TOOLKIT}:signInWithPassword?key=${env.firebase.apiKey}`;
  try {
    return await postJson(url, { email, password, returnSecureToken: true });
  } catch (err) {
    throw mapSignInError(err.firebaseCode);
  }
}

/**
 * Exchange a refresh token for a fresh ID token.
 * @returns {{ id_token: string, refresh_token: string, expires_in: string, user_id: string }}
 */
async function exchangeRefreshToken(refreshToken) {
  const url = `${SECURE_TOKEN}?key=${env.firebase.apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw mapRefreshError(data && data.error && data.error.message);
    }
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw mapRefreshError();
  }
}

module.exports = { signInWithPassword, exchangeRefreshToken };

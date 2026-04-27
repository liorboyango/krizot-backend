/**
 * Token Blacklist
 *
 * In-memory Set that stores invalidated JWT tokens (logged-out users).
 * Tokens are automatically removed when they expire to prevent memory leaks.
 *
 * NOTE: In a multi-instance deployment, replace this with a Redis-backed
 * solution so all instances share the same blacklist.
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * @type {Map<string, number>} token → expiry timestamp (ms)
 */
const _blacklist = new Map();

/**
 * Adds a token to the blacklist.
 * Automatically schedules removal when the token expires.
 *
 * @param {string} token - JWT token string
 */
function addToBlacklist(token) {
  try {
    // Decode without verifying to get expiry (token may already be expired)
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      // No expiry — add with a default TTL of 24 hours
      const expiry = Date.now() + 24 * 60 * 60 * 1000;
      _blacklist.set(token, expiry);
      setTimeout(() => _blacklist.delete(token), 24 * 60 * 60 * 1000);
      return;
    }

    const expiryMs = decoded.exp * 1000;
    const ttl = expiryMs - Date.now();

    if (ttl <= 0) {
      // Already expired — no need to blacklist
      return;
    }

    _blacklist.set(token, expiryMs);
    setTimeout(() => {
      _blacklist.delete(token);
      logger.debug('Removed expired token from blacklist');
    }, ttl);

    logger.debug(`Token blacklisted. Expires in ${Math.ceil(ttl / 1000)}s`);
  } catch (err) {
    logger.error('Failed to add token to blacklist', { error: err.message });
  }
}

/**
 * Checks if a token is blacklisted.
 * @param {string} token
 * @returns {boolean}
 */
function has(token) {
  return _blacklist.has(token);
}

/**
 * Returns the current size of the blacklist (for monitoring).
 * @returns {number}
 */
function size() {
  return _blacklist.size;
}

/**
 * Clears all entries (useful for testing).
 */
function clear() {
  _blacklist.clear();
}

const tokenBlacklist = { addToBlacklist, has, size, clear };

module.exports = { tokenBlacklist };

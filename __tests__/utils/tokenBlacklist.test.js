/**
 * Tests for Token Blacklist Utility
 */

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const { tokenBlacklist } = require('../../src/utils/tokenBlacklist');

describe('tokenBlacklist', () => {
  beforeEach(() => {
    tokenBlacklist.clear();
  });

  it('should return false for a token not in the blacklist', () => {
    expect(tokenBlacklist.has('some-token')).toBe(false);
  });

  it('should return true after adding a token', () => {
    const token = jwt.sign({ id: '1', type: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    tokenBlacklist.addToBlacklist(token);
    expect(tokenBlacklist.has(token)).toBe(true);
  });

  it('should not add already-expired tokens', () => {
    const token = jwt.sign({ id: '1', type: 'access' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    tokenBlacklist.addToBlacklist(token);
    // Already expired tokens should not be added (TTL <= 0)
    expect(tokenBlacklist.has(token)).toBe(false);
  });

  it('should report correct size', () => {
    expect(tokenBlacklist.size()).toBe(0);
    const token = jwt.sign({ id: '1', type: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    tokenBlacklist.addToBlacklist(token);
    expect(tokenBlacklist.size()).toBe(1);
  });

  it('should clear all tokens', () => {
    const token = jwt.sign({ id: '1', type: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    tokenBlacklist.addToBlacklist(token);
    tokenBlacklist.clear();
    expect(tokenBlacklist.size()).toBe(0);
    expect(tokenBlacklist.has(token)).toBe(false);
  });
});

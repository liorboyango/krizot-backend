/**
 * Jest Configuration
 */

'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',          // entry point — tested via integration
    '!src/config/prisma.js',  // DB client — mocked in tests
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  // Increase timeout for integration tests
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};

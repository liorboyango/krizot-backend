/**
 * Environment Configuration Module
 *
 * Validates and exports all environment variables required by the application.
 * Fails fast on startup if required variables are missing or invalid.
 */

'use strict';

require('dotenv').config();

const Joi = require('joi');

// ─── Schema ──────────────────────────────────────────────────────────────────

const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),

  // Database
  DATABASE_URL: Joi.string().uri().required().description('PostgreSQL connection string'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().description('JWT signing secret (min 32 chars)'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m').description('Access token TTL'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d').description('Refresh token TTL'),

  // CORS
  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://localhost:8080')
    .description('Comma-separated list of allowed origins'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(60000).description('Rate limit window in ms'),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(100).description('Max requests per window'),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().default(10).description('Max auth attempts per window'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  // Security
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),

  // Optional: Redis (for token blacklist / caching)
  REDIS_URL: Joi.string().uri().optional().description('Redis connection string'),
})
  .unknown(true) // allow other env vars (e.g. PATH, HOME)
  .options({ abortEarly: false });

// ─── Validate ────────────────────────────────────────────────────────────────

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  const details = error.details.map((d) => `  • ${d.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[ENV] Configuration validation failed:\n${details}\n`);
  process.exit(1);
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  isDevelopment: envVars.NODE_ENV === 'development',

  server: {
    port: envVars.PORT,
  },

  database: {
    url: envVars.DATABASE_URL,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    authMax: envVars.AUTH_RATE_LIMIT_MAX,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },

  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
  },

  redis: {
    url: envVars.REDIS_URL || null,
  },
};

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

  // Firebase
  FIREBASE_SERVICE_ACCOUNT: Joi.string()
    .required()
    .description('Firebase service-account JSON (full document, inline)'),
  FIREBASE_API_KEY: Joi.string()
    .required()
    .description('Firebase Web API key (used by Identity Toolkit sign-in)'),

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
})
  .unknown(true)
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

  firebase: {
    serviceAccount: envVars.FIREBASE_SERVICE_ACCOUNT,
    apiKey: envVars.FIREBASE_API_KEY,
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
};

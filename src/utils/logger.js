/**
 * Structured Logger
 *
 * Winston-based logger with request correlation IDs,
 * structured JSON output for production, and pretty-print for development.
 */

'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, errors, json, colorize, printf, splat } = format;

// Lazy-load config to avoid circular dependency during startup validation
let _config = null;
const getConfig = () => {
  if (!_config) _config = require('../config/env');
  return _config;
};

// ─── Custom Formats ───────────────────────────────────────────────────────────

const prettyFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let log = `${ts} [${level}] ${message}`;
  if (Object.keys(meta).length) log += ` ${JSON.stringify(meta)}`;
  if (stack) log += `\n${stack}`;
  return log;
});

// ─── Logger Factory ───────────────────────────────────────────────────────────

const buildLogger = () => {
  const config = getConfig();
  const isPretty = config.logging.format === 'pretty' || config.isDevelopment;

  const formatPipeline = isPretty
    ? combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        splat(),
        prettyFormat,
      )
    : combine(
        timestamp(),
        errors({ stack: true }),
        splat(),
        json(),
      );

  return createLogger({
    level: config.logging.level,
    format: formatPipeline,
    transports: [
      new transports.Console({
        silent: config.isTest, // suppress logs during tests
      }),
    ],
    exitOnError: false,
  });
};

const logger = buildLogger();

// ─── HTTP Request Logger Stream (for Morgan) ─────────────────────────────────

logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
